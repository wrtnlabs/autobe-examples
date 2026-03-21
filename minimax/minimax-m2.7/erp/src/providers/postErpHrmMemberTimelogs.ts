import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
  // Step 1: Find the active employee's record in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // Step 2: Validate project exists and employee is a member of it
  const projectMembership = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.body.projectId,
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      projectMemberships: {
        some: {
          erp_hrm_employee_id: employee.id,
        },
      },
    },
    select: { id: true },
  });
  if (!projectMembership) {
    throw new HttpException(
      "You are not a member of this project or the project does not exist",
      403,
    );
  }
  // Step 3: Validate task belongs to the project (if taskId is provided)
  if (props.body.taskId) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.taskId,
        erp_hrm_project_id: props.body.projectId,
      },
      select: { id: true },
    });
    if (!task) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Step 4: Create timelog using collector for data transformation
  const created = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: await ErpHrmTimelogCollector.collect({
      body: props.body,
      employee: { id: employee.id },
    }),
    ...ErpHrmTimelogTransformer.select(),
  });
  // Step 5: Return transformed response
  return await ErpHrmTimelogTransformer.transform(created);
}
