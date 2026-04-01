import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTimerCollector } from "../collectors/ErpHrmTimeTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimerTransformer } from "../transformers/ErpHrmTimeTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimer.ICreate;
}): Promise<IErpHrmTimeTimer> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        status: true,
      },
    });
  if (employee.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: { id: props.body.project_id },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        deleted_at: true,
      },
    },
  );
  if (project.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    project.erp_hrm_time_organization_id !==
    employee.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: {
        id: true,
        erp_hrm_time_project_id: true,
        deleted_at: true,
      },
    });
    if (task.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    if (task.erp_hrm_time_project_id !== project.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const active = await MyGlobal.prisma.erp_hrm_time_timers.findFirst({
    where: {
      employee_id: employee.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (active !== null) {
    throw new HttpException("Conflict", 409);
  }
  const created = await MyGlobal.prisma.erp_hrm_time_timers.create({
    data: await ErpHrmTimeTimerCollector.collect({
      body: props.body,
      member: props.member,
      employee: employee,
    }),
    ...ErpHrmTimeTimerTransformer.select(),
  });
  return await ErpHrmTimeTimerTransformer.transform(created);
}
