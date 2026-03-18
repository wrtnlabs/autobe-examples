import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminAdminPasswordResetsRedeem(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminPasswordReset;
}): Promise<IShoppingMallAdmin> {
  const nowIso = toISOStringSafe(new Date());
  const genericForbidden = (): never => {
    throw new HttpException("Invalid token", 403);
  };
  const reset =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.findUnique({
      where: { token: props.body.token },
      select: {
        id: true,
        shopping_mall_admins_id: true,
        expires_at: true,
        deleted_at: true,
      },
    });
  if (reset === null) {
    genericForbidden();
  }
  // After genericForbidden(), TS still may not narrow; assert with control-flow.
  const safeReset = reset as NonNullable<typeof reset>;
  if (safeReset.deleted_at !== null) {
    genericForbidden();
  }
  if (toISOStringSafe(safeReset.expires_at) <= nowIso) {
    genericForbidden();
  }
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.$transaction(async (tx) => {
    const updatedReset =
      await tx.shopping_mall_admin_password_resets.updateMany({
        where: {
          id: safeReset.id,
          deleted_at: null,
          token: props.body.token,
          expires_at: { gt: new Date(nowIso) },
        },
        data: {
          deleted_at: new Date(nowIso),
          updated_at: new Date(nowIso),
        },
      });
    if (updatedReset.count !== 1) {
      genericForbidden();
    }
    await tx.shopping_mall_admins.update({
      where: { id: safeReset.shopping_mall_admins_id },
      data: {
        password_hash: hashedPassword,
        updated_at: new Date(nowIso),
      },
    });
  });
  const redeemed = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow(
    {
      where: { id: safeReset.shopping_mall_admins_id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  return {
    id: redeemed.id,
    email: redeemed.email,
    created_at: toISOStringSafe(redeemed.created_at),
    updated_at: toISOStringSafe(redeemed.updated_at),
    deleted_at:
      redeemed.deleted_at === null
        ? null
        : toISOStringSafe(redeemed.deleted_at),
  };
}
