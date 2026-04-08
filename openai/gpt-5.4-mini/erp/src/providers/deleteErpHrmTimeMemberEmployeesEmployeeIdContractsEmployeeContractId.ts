import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteErpHrmTimeMemberEmployeesEmployeeIdContractsEmployeeContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  employeeContractId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  const contract =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findFirstOrThrow({
      where: {
        id: props.employeeContractId,
        erp_hrm_time_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        end_date: true,
      },
    });
  if (contract.end_date === null) {
    throw new HttpException("Cannot delete active employment contract", 409);
  }
  await MyGlobal.prisma.erp_hrm_time_employee_contracts.delete({
    where: {
      id: contract.id,
    },
  });
}
