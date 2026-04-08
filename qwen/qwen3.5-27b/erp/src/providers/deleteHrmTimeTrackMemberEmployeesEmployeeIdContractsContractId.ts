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

export async function deleteHrmTimeTrackMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query the contract with employee relation to validate ownership
  const contract =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_employee_id: true,
        end_date: true,
        employee: {
          select: {
            id: true,
            hrm_time_track_member_id: true,
          },
        },
      },
    });
  // Validate contract belongs to the specified employee
  if (contract.hrm_time_track_employee_id !== props.employeeId) {
    throw new HttpException(
      "Contract does not belong to the specified employee",
      400,
    );
  }
  // Validate employee belongs to the authenticated member
  if (contract.employee.hrm_time_track_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate contract is not a past contract (end_date must be null or in the future)
  if (contract.end_date !== null) {
    const now = new Date();
    if (contract.end_date < now) {
      throw new HttpException("Past contracts cannot be deleted", 400);
    }
  }
  // Soft delete the contract
  await MyGlobal.prisma.hrm_time_track_employee_contracts.update({
    where: {
      id: props.contractId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
