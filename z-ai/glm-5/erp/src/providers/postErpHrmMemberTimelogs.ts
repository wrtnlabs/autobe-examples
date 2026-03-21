import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimelogCollector } from "../collectors/ErpHrmTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.ICreate;
}): Promise<IErpHrmTimelog> {
  // 1. Get session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // 2. Get employee record for this member in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: { id: true, status: true },
  });
  // 3. Check employee is active (section 179)
  if (employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot create timelogs",
      403,
    );
  }
  // 4. Verify project membership (section 120)
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.body.project_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (!projectMember) {
    throw new HttpException("You are not assigned to this project", 403);
  }
  // 5. Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.task_id },
      select: { id: true, project_id: true, deleted_at: true },
    });
    if (!task || task.deleted_at !== null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // 6. Create timelog using collector
  const createData = await ErpHrmTimelogCollector.collect({
    body: props.body,
    erpHrmEmployees: { id: employee.id },
  });
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: createData,
    ...ErpHrmTimelogTransformer.select(),
  });
  // 7. Transform and return
  return await ErpHrmTimelogTransformer.transform(timelog);
}
