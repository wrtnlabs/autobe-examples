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

export async function putHrmTimeTrackingOwnerPasswordResetsPasswordResetId(props: {
  owner: OwnerPayload;
  passwordResetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOwnerPasswordReset.IUpdate;
}): Promise<IHrmTimeTrackingOwnerPasswordReset> {
  const now: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new globalThis.Date().toISOString());
  const nowTime: number = globalThis.Date.parse(now);
  const ownerReset =
    await MyGlobal.prisma.hrm_time_tracking_owner_password_resets.findUnique({
      where: { id: props.passwordResetId },
      select: {
        id: true,
        hrm_time_tracking_owner_id: true,
        token: true,
        expired_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (ownerReset !== null) {
    if (ownerReset.token !== props.body.token) {
      throw new HttpException("Invalid password reset token", 400);
    }
    if (ownerReset.deleted_at !== null) {
      throw new HttpException("Password reset request is unavailable", 400);
    }
    if (ownerReset.used_at !== null) {
      throw new HttpException(
        "Password reset request has already been consumed",
        400,
      );
    }
    if (
      globalThis.Date.parse(toISOStringSafe(ownerReset.expired_at)) <= nowTime
    ) {
      throw new HttpException("Password reset request has expired", 400);
    }
    const hashed: string = await PasswordUtil.hash(props.body.password);
    const result = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.hrm_time_tracking_owners.update({
        where: { id: ownerReset.hrm_time_tracking_owner_id },
        data: {
          password_hash: hashed,
          updated_at: new globalThis.Date(now),
        },
      });
      return await tx.hrm_time_tracking_owner_password_resets.update({
        where: { id: ownerReset.id },
        data: {
          used_at: new globalThis.Date(now),
          updated_at: new globalThis.Date(now),
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
      id: result.id,
      actorType: "owner",
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(result.expired_at),
      ),
      used_at:
        result.used_at === null
          ? null
          : typia.assert<string & tags.Format<"date-time">>(
              toISOStringSafe(result.used_at),
            ),
      created_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(result.created_at),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(result.updated_at),
      ),
      deleted_at:
        result.deleted_at === null
          ? null
          : typia.assert<string & tags.Format<"date-time">>(
              toISOStringSafe(result.deleted_at),
            ),
    };
  }
  const managerReset =
    await MyGlobal.prisma.hrm_time_tracking_manager_password_resets.findUnique({
      where: { id: props.passwordResetId },
      select: {
        id: true,
        hrm_time_tracking_manager_id: true,
        token: true,
        expired_at: true,
        consumed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (managerReset !== null) {
    if (managerReset.token !== props.body.token) {
      throw new HttpException("Invalid password reset token", 400);
    }
    if (managerReset.deleted_at !== null) {
      throw new HttpException("Password reset request is unavailable", 400);
    }
    if (managerReset.consumed_at !== null) {
      throw new HttpException(
        "Password reset request has already been consumed",
        400,
      );
    }
    if (
      globalThis.Date.parse(toISOStringSafe(managerReset.expired_at)) <= nowTime
    ) {
      throw new HttpException("Password reset request has expired", 400);
    }
    const hashed: string = await PasswordUtil.hash(props.body.password);
    const result = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.hrm_time_tracking_managers.update({
        where: { id: managerReset.hrm_time_tracking_manager_id },
        data: {
          password_hash: hashed,
          updated_at: new globalThis.Date(now),
        },
      });
      return await tx.hrm_time_tracking_manager_password_resets.update({
        where: { id: managerReset.id },
        data: {
          consumed_at: new globalThis.Date(now),
          updated_at: new globalThis.Date(now),
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
      id: result.id,
      actorType: "manager",
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(result.expired_at),
      ),
      used_at:
        result.consumed_at === null
          ? null
          : typia.assert<string & tags.Format<"date-time">>(
              toISOStringSafe(result.consumed_at),
            ),
      created_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(result.created_at),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(result.updated_at),
      ),
      deleted_at:
        result.deleted_at === null
          ? null
          : typia.assert<string & tags.Format<"date-time">>(
              toISOStringSafe(result.deleted_at),
            ),
    };
  }
  const employeeReset =
    await MyGlobal.prisma.hrm_time_tracking_employee_password_resets.findUnique(
      {
        where: { id: props.passwordResetId },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          token: true,
          expired_at: true,
          used_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  if (employeeReset === null) {
    throw new HttpException("Not Found", 404);
  }
  if (employeeReset.token !== props.body.token) {
    throw new HttpException("Invalid password reset token", 400);
  }
  if (employeeReset.used_at !== null) {
    throw new HttpException(
      "Password reset request has already been consumed",
      400,
    );
  }
  if (
    globalThis.Date.parse(toISOStringSafe(employeeReset.expired_at)) <= nowTime
  ) {
    throw new HttpException("Password reset request has expired", 400);
  }
  const hashed: string = await PasswordUtil.hash(props.body.password);
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_employees.update({
      where: { id: employeeReset.hrm_time_tracking_employee_id },
      data: {
        password_hash: hashed,
        updated_at: new globalThis.Date(now),
      },
    });
    return await tx.hrm_time_tracking_employee_password_resets.update({
      where: { id: employeeReset.id },
      data: {
        used_at: new globalThis.Date(now),
        updated_at: new globalThis.Date(now),
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
    id: result.id,
    actorType: "employee",
    expired_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(result.expired_at),
    ),
    used_at:
      result.used_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(result.used_at),
          ),
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(result.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(result.updated_at),
    ),
    deleted_at: null,
  };
}
