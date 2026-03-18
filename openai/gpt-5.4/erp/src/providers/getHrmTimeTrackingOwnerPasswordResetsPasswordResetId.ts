import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOwnerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerPasswordReset";
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

export async function getHrmTimeTrackingOwnerPasswordResetsPasswordResetId(props: {
  owner: OwnerPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOwnerPasswordReset> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirstOrThrow({
    where: {
      id: props.owner.session_id,
      hrm_time_tracking_owner_id: props.owner.id,
      expired_at: {
        gt: now,
      },
      owner: {
        deleted_at: null,
        deactivated_at: null,
      },
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_owners.findFirstOrThrow({
    where: {
      id: props.owner.id,
      deleted_at: null,
      deactivated_at: null,
    },
    select: {
      id: true,
    },
  });
  const ownerReset =
    await MyGlobal.prisma.hrm_time_tracking_owner_password_resets.findUnique({
      where: {
        id: props.passwordResetId,
      },
      select: {
        id: true,
        expired_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const managerReset =
    await MyGlobal.prisma.hrm_time_tracking_manager_password_resets.findUnique({
      where: {
        id: props.passwordResetId,
      },
      select: {
        id: true,
        expired_at: true,
        consumed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const employeeReset =
    await MyGlobal.prisma.hrm_time_tracking_employee_password_resets.findUnique(
      {
        where: {
          id: props.passwordResetId,
        },
        select: {
          id: true,
          expired_at: true,
          used_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  const matchedCount =
    (ownerReset === null ? 0 : 1) +
    (managerReset === null ? 0 : 1) +
    (employeeReset === null ? 0 : 1);
  if (matchedCount === 0) {
    throw new HttpException("Not Found", 404);
  }
  if (matchedCount > 1) {
    throw new HttpException("Password reset record integrity failure", 500);
  }
  if (ownerReset !== null) {
    return {
      id: ownerReset.id,
      actorType: "owner",
      expired_at: toISOStringSafe(ownerReset.expired_at),
      used_at:
        ownerReset.used_at === null
          ? null
          : toISOStringSafe(ownerReset.used_at),
      created_at: toISOStringSafe(ownerReset.created_at),
      updated_at: toISOStringSafe(ownerReset.updated_at),
      deleted_at:
        ownerReset.deleted_at === null
          ? null
          : toISOStringSafe(ownerReset.deleted_at),
    };
  }
  if (managerReset !== null) {
    return {
      id: managerReset.id,
      actorType: "manager",
      expired_at: toISOStringSafe(managerReset.expired_at),
      used_at:
        managerReset.consumed_at === null
          ? null
          : toISOStringSafe(managerReset.consumed_at),
      created_at: toISOStringSafe(managerReset.created_at),
      updated_at: toISOStringSafe(managerReset.updated_at),
      deleted_at:
        managerReset.deleted_at === null
          ? null
          : toISOStringSafe(managerReset.deleted_at),
    };
  }
  if (employeeReset === null) {
    throw new HttpException("Password reset record integrity failure", 500);
  }
  return {
    id: employeeReset.id,
    actorType: "employee",
    expired_at: toISOStringSafe(employeeReset.expired_at),
    used_at:
      employeeReset.used_at === null
        ? null
        : toISOStringSafe(employeeReset.used_at),
    created_at: toISOStringSafe(employeeReset.created_at),
    updated_at: toISOStringSafe(employeeReset.updated_at),
    deleted_at: null,
  };
}
