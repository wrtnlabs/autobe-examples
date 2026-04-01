import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeEmployeeContractHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContractHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberEmployeesEmployeeIdContractsHistory(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeEmployeeContractHistory> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
        erp_hrm_time_member_id: props.member.id,
      },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  const contracts =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findMany({
      where: {
        erp_hrm_time_employee_id: employee.id,
      },
      orderBy: [
        {
          start_date: "asc",
        },
        {
          end_date: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        erp_hrm_time_employee_id: true,
      },
    });
  return {
    contracts: contracts.map((contract) => ({
      id: contract.id,
      start_date: toISOStringSafe(contract.start_date),
      end_date:
        contract.end_date === null ? null : toISOStringSafe(contract.end_date),
      pay_rate: contract.pay_rate,
      pay_period: contract.pay_period,
      working_hours_per_week: contract.working_hours_per_week,
      notes: contract.notes,
      created_at: toISOStringSafe(contract.created_at),
      updated_at: toISOStringSafe(contract.updated_at),
      deleted_at:
        contract.deleted_at === null
          ? null
          : toISOStringSafe(contract.deleted_at),
      erp_hrm_time_employee_id: contract.erp_hrm_time_employee_id,
    })) as any,
  };
}
