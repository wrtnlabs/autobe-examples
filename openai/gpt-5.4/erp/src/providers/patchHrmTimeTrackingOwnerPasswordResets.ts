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

export async function patchHrmTimeTrackingOwnerPasswordResets(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingOwnerPasswordReset.IRequest;
}): Promise<IHrmTimeTrackingOwnerPasswordReset> {
  const nowText: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  if (props.body.actor === "owner") {
    const reset =
      await MyGlobal.prisma.hrm_time_tracking_owner_password_resets.findUnique({
        where: { token: props.body.token },
        select: {
          id: true,
          hrm_time_tracking_owner_id: true,
          expired_at: true,
          used_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    if (reset === null) {
      throw new HttpException("Invalid password reset token", 403);
    }
    if (reset.deleted_at !== null) {
      throw new HttpException("Invalid password reset token", 403);
    }
    if (reset.used_at !== null) {
      throw new HttpException("Invalid password reset token", 403);
    }
    if (toISOStringSafe(reset.expired_at) <= nowText) {
      throw new HttpException("Invalid password reset token", 403);
    }
    const updated = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.hrm_time_tracking_owners.update({
        where: { id: reset.hrm_time_tracking_owner_id },
        data: {
          password_hash: passwordHash,
          updated_at: new globalThis.Date(nowText),
        },
      });
      return await tx.hrm_time_tracking_owner_password_resets.update({
        where: { id: reset.id },
        data: {
          used_at: new globalThis.Date(nowText),
          updated_at: new globalThis.Date(nowText),
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
    });
    return {
      id: updated.id,
      actorType: "owner",
      expired_at: toISOStringSafe(updated.expired_at),
      used_at:
        updated.used_at === null ? null : toISOStringSafe(updated.used_at),
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    };
  }
  if (props.body.actor === "manager") {
    const reset =
      await MyGlobal.prisma.hrm_time_tracking_manager_password_resets.findUnique(
        {
          where: { token: props.body.token },
          select: {
            id: true,
            hrm_time_tracking_manager_id: true,
            expired_at: true,
            consumed_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    if (reset === null) {
      throw new HttpException("Invalid password reset token", 403);
    }
    if (reset.deleted_at !== null) {
      throw new HttpException("Invalid password reset token", 403);
    }
    if (reset.consumed_at !== null) {
      throw new HttpException("Invalid password reset token", 403);
    }
    if (toISOStringSafe(reset.expired_at) <= nowText) {
      throw new HttpException("Invalid password reset token", 403);
    }
    const updated = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.hrm_time_tracking_managers.update({
        where: { id: reset.hrm_time_tracking_manager_id },
        data: {
          password_hash: passwordHash,
          updated_at: new globalThis.Date(nowText),
        },
      });
      return await tx.hrm_time_tracking_manager_password_resets.update({
        where: { id: reset.id },
        data: {
          consumed_at: new globalThis.Date(nowText),
          updated_at: new globalThis.Date(nowText),
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
    });
    return {
      id: updated.id,
      actorType: "manager",
      expired_at: toISOStringSafe(updated.expired_at),
      used_at:
        updated.consumed_at === null
          ? null
          : toISOStringSafe(updated.consumed_at),
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    };
  }
  const reset =
    await MyGlobal.prisma.hrm_time_tracking_employee_password_resets.findUnique(
      {
        where: { token: props.body.token },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          expired_at: true,
          used_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  if (reset === null) {
    throw new HttpException("Invalid password reset token", 403);
  }
  if (reset.used_at !== null) {
    throw new HttpException("Invalid password reset token", 403);
  }
  if (toISOStringSafe(reset.expired_at) <= nowText) {
    throw new HttpException("Invalid password reset token", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_employees.update({
      where: { id: reset.hrm_time_tracking_employee_id },
      data: {
        password_hash: passwordHash,
        updated_at: new globalThis.Date(nowText),
      },
    });
    return await tx.hrm_time_tracking_employee_password_resets.update({
      where: { id: reset.id },
      data: {
        used_at: new globalThis.Date(nowText),
        updated_at: new globalThis.Date(nowText),
      },
      select: {
        id: true,
        expired_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  });
  return {
    id: updated.id,
    actorType: "employee",
    expired_at: toISOStringSafe(updated.expired_at),
    used_at: updated.used_at === null ? null : toISOStringSafe(updated.used_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: null,
  };
}
