import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogTransformer } from "../transformers/ErpHrmTimeTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimersStop(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTimelog> {
  const member = await MyGlobal.prisma.erp_hrm_time_members.findUnique({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      deleted_at: true,
      employees: {
        select: {
          id: true,
          status: true,
          deleted_at: true,
        },
      },
    },
  });
  if (member === null || member.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = member.employees[0];
  if (
    employee === undefined ||
    employee.deleted_at !== null ||
    employee.status !== "active"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const currentText = toISOStringSafe(new Date());
  const currentAt = new Date(currentText);
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const timer = await prisma.erp_hrm_time_timers.findFirst({
      where: {
        member_id: props.member.id,
        employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        project_id: true,
        task_id: true,
        started_at: true,
        description: true,
        deleted_at: true,
      },
    });
    if (timer === null) {
      throw new HttpException("No active timer", 409);
    }
    if (timer.deleted_at !== null) {
      throw new HttpException("Timer already stopped", 409);
    }
    const duration_minutes = Math.max(
      1,
      Math.round((currentAt.getTime() - timer.started_at.getTime()) / 60000),
    );
    const stopResult = await prisma.erp_hrm_time_timers.updateMany({
      where: {
        id: timer.id,
        deleted_at: null,
      },
      data: {
        deleted_at: currentAt,
        updated_at: currentAt,
      },
    });
    if (stopResult.count !== 1) {
      throw new HttpException("Timer already stopped", 409);
    }
    return await prisma.erp_hrm_time_timelogs.create({
      data: {
        id: v4(),
        erp_hrm_time_member_id: timer.member_id,
        erp_hrm_time_project_id: timer.project_id,
        erp_hrm_time_task_id: timer.task_id,
        work_date: timer.started_at,
        duration_minutes: duration_minutes,
        description: timer.description,
        billable: false,
        created_at: currentAt,
        updated_at: currentAt,
        deleted_at: null,
      },
      ...ErpHrmTimeTimelogTransformer.select(),
    });
  });
  return await ErpHrmTimeTimelogTransformer.transform(created);
}
