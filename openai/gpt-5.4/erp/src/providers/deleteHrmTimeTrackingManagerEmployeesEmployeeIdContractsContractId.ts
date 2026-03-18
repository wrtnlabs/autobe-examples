import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId(props: {
  manager: ManagerPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date();
  await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findFirstOrThrow({
    where: {
      id: props.manager.session_id,
      hrm_time_tracking_manager_id: props.manager.id,
      expired_at: {
        gt: now,
      },
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_managers.findFirstOrThrow({
    where: {
      id: props.manager.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const contract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirstOrThrow(
      {
        where: {
          id: props.contractId,
          hrm_time_tracking_employee_id: props.employeeId,
          deleted_at: null,
        },
        select: {
          id: true,
          end_date: true,
        },
      },
    );
  if (contract.end_date !== null && contract.end_date < now) {
    throw new HttpException(
      "Protected historical contract cannot be removed",
      409,
    );
  }
  const result =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.updateMany({
      where: {
        id: props.contractId,
        hrm_time_tracking_employee_id: props.employeeId,
        deleted_at: null,
      },
      data: {
        updated_at: now,
        deleted_at: now,
      },
    });
  if (result.count === 0) {
    throw new HttpException("Not Found", 404);
  }
}
