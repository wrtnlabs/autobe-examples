import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallAdminsShoppingMallAdminId(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  const existing = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.shoppingMallAdminId },
  });

  if (!existing) {
    throw new HttpException("Shopping mall administrator not found", 404);
  }

  if (props.body.email !== undefined) {
    const duplicate = await MyGlobal.prisma.shopping_mall_admins.findFirst({
      where: {
        email: props.body.email,
        NOT: { id: props.shoppingMallAdminId },
      },
    });

    if (duplicate) {
      throw new HttpException("Email address is already in use", 400);
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.shoppingMallAdminId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
