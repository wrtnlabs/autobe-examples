import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
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
        status: "active",
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.body.project_id,
      erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
    },
    select: { id: true },
  });
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
      where: {
        id: props.body.task_id,
        erp_hrm_time_project_id: props.body.project_id,
      },
      select: { id: true },
    });
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.erp_hrm_time_timers.findUnique({
      where: { employee_id: employee.id },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Active timer already exists", 409);
    }
    try {
      return await tx.erp_hrm_time_timers.create({
        data: await ErpHrmTimeTimerCollector.collect({
          body: props.body,
          member: props.member,
          employee,
        }),
        ...ErpHrmTimeTimerTransformer.select(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HttpException("Active timer already exists", 409);
      }
      throw error;
    }
  });
  return ErpHrmTimeTimerTransformer.transform(created);
}
