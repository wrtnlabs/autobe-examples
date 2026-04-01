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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimerTransformer } from "../transformers/ErpHrmTimeTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimer.IUpdate;
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
        deleted_at: true,
      },
    });
  const timer = await MyGlobal.prisma.erp_hrm_time_timers.findFirstOrThrow({
    where: {
      employee_id: employee.id,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      deleted_at: true,
    },
  });
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.body.project_id,
      erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      deleted_at: true,
    },
  });
  const taskId =
    props.body.task_id === undefined || props.body.task_id === null
      ? null
      : (
          await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
            where: {
              id: props.body.task_id,
              erp_hrm_time_project_id: project.id,
              deleted_at: null,
            },
            select: {
              id: true,
              erp_hrm_time_project_id: true,
              deleted_at: true,
            },
          })
        ).id;
  await MyGlobal.prisma.erp_hrm_time_timers.update({
    where: { id: timer.id },
    data: {
      project_id: project.id,
      task_id: taskId,
      description: props.body.description ?? null,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_timers.findUniqueOrThrow({
    where: { id: timer.id },
    ...ErpHrmTimeTimerTransformer.select(),
  });
  return await ErpHrmTimeTimerTransformer.transform(updated);
}
