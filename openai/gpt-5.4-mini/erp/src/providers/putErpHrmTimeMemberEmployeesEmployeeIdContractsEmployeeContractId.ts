import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeContractTransformer } from "../transformers/ErpHrmTimeEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberEmployeesEmployeeIdContractsEmployeeContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  employeeContractId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployeeContract.IUpdate;
}): Promise<IErpHrmTimeEmployeeContract> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
        erp_hrm_time_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  if (membership === null) throw new HttpException("Forbidden", 403);
  const target =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findUniqueOrThrow({
      where: { id: props.employeeContractId },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        deleted_at: true,
      },
    });
  if (target.erp_hrm_time_employee_id !== props.employeeId) {
    throw new HttpException("Forbidden", 403);
  }
  const current =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findFirst({
      where: {
        erp_hrm_time_employee_id: props.employeeId,
        deleted_at: null,
      },
      orderBy: {
        start_date: "desc",
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
      },
    });
  if (current === null || current.id !== target.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.pay_period !== undefined &&
    props.body.pay_period !== "hourly" &&
    props.body.pay_period !== "daily" &&
    props.body.pay_period !== "weekly" &&
    props.body.pay_period !== "monthly"
  ) {
    throw new HttpException("Invalid pay period", 400);
  }
  const startDateText =
    props.body.start_date ?? target.start_date.toISOString();
  const endDateText =
    props.body.end_date === undefined
      ? (target.end_date?.toISOString() ?? null)
      : props.body.end_date;
  if (endDateText !== null && startDateText > endDateText) {
    throw new HttpException("Invalid contract date range", 400);
  }
  const next = await MyGlobal.prisma.erp_hrm_time_employee_contracts.findFirst({
    where: {
      erp_hrm_time_employee_id: props.employeeId,
      deleted_at: null,
      start_date: {
        gt: target.start_date,
      },
    },
    orderBy: {
      start_date: "asc",
    },
    select: {
      id: true,
      start_date: true,
    },
  });
  if (
    next !== null &&
    endDateText !== null &&
    endDateText >= next.start_date.toISOString()
  ) {
    throw new HttpException("Contract dates overlap", 400);
  }
  await MyGlobal.prisma.erp_hrm_time_employee_contracts.update({
    where: { id: props.employeeContractId },
    data: {
      ...(props.body.start_date !== undefined
        ? { start_date: props.body.start_date }
        : {}),
      ...(props.body.end_date !== undefined
        ? { end_date: props.body.end_date }
        : {}),
      ...(props.body.pay_rate !== undefined
        ? { pay_rate: props.body.pay_rate }
        : {}),
      ...(props.body.pay_period !== undefined
        ? { pay_period: props.body.pay_period }
        : {}),
      ...(props.body.working_hours_per_week !== undefined
        ? { working_hours_per_week: props.body.working_hours_per_week }
        : {}),
      ...(props.body.notes !== undefined ? { notes: props.body.notes } : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findUniqueOrThrow({
      where: { id: props.employeeContractId },
      ...ErpHrmTimeEmployeeContractTransformer.select(),
    });
  return ErpHrmTimeEmployeeContractTransformer.transform(updated);
}
