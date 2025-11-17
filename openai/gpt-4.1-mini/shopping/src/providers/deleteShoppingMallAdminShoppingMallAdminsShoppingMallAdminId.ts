import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallAdminsShoppingMallAdminId(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.shoppingMallAdminId },
  });

  if (!existing) {
    throw new HttpException("Administrator not found.", 404);
  }

  await MyGlobal.prisma.shopping_mall_admins.delete({
    where: { id: props.shoppingMallAdminId },
  });
}
