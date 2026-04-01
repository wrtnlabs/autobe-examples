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
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminAdminPasswordResetsRedeem(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminPasswordReset;
}): Promise<IShoppingMallAdmin> {
  const serverNow = toISOStringSafe(new Date());
  const reset =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.findUnique({
      where: { token: props.body.token },
      select: {
        id: true,
        shopping_mall_admins_id: true,
        deleted_at: true,
        expires_at: true,
      },
    });
  if (
    reset === null ||
    reset.deleted_at !== null ||
    toISOStringSafe(reset.expires_at) <= serverNow
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const nextPasswordHash = await (PasswordUtil as any).hashPassword?.({
    password: props.body.password,
  });
  const validated = await (PasswordUtil as any).validatePassword?.({
    password: props.body.password,
  });
  if (typeof nextPasswordHash !== "string" || validated === false) {
    throw new HttpException("Forbidden", 403);
  }
  const redeemedAdminId = reset.shopping_mall_admins_id;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_admins.update({
      where: { id: redeemedAdminId },
      data: {
        password_hash: nextPasswordHash,
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_admin_password_resets.update({
      where: { id: reset.id },
      data: {
        deleted_at: new Date(serverNow),
        updated_at: new Date(),
      },
    });
  });
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: redeemedAdminId },
    select: ShoppingMallAdminTransformer.select().select,
  });
  return await ShoppingMallAdminTransformer.transform(admin);
}
