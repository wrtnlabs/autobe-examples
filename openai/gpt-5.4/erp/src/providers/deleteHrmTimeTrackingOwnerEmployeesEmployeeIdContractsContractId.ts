import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingOwnerEmployeesEmployeeIdContractsContractId(props: {
  owner: OwnerPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirst({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
        expired_at: {
          gt: new globalThis.Date(now),
        },
        owner: {
          deleted_at: null,
          deactivated_at: null,
        },
        organization: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employeeContract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirst({
      where: {
        id: props.contractId,
        hrm_time_tracking_employee_id: props.employeeId,
        deleted_at: null,
        employee: {
          id: props.employeeId,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        end_date: true,
        employee: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_time_tracking_employeesFindManyArgs,
      },
    });
  if (employeeContract === null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    employeeContract.end_date !== null &&
    toISOStringSafe(employeeContract.end_date) < now
  ) {
    throw new HttpException(
      "Protected historical contract cannot be removed",
      409,
    );
  }
  await MyGlobal.prisma.hrm_time_tracking_employee_contracts.update({
    where: {
      id: employeeContract.id,
    },
    data: {
      updated_at: new globalThis.Date(now),
      deleted_at: new globalThis.Date(now),
    },
  });
}
