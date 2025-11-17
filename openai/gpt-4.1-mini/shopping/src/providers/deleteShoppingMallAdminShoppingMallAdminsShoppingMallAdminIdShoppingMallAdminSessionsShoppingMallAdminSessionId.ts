import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallAdminsShoppingMallAdminIdShoppingMallAdminSessionsShoppingMallAdminSessionId(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
  shoppingMallAdminSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: props.shoppingMallAdminSessionId,
      shopping_mall_admin_id: props.shoppingMallAdminId,
    },
  });

  if (!session) {
    throw new HttpException("Admin session not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_admin_sessions.delete({
    where: { id: props.shoppingMallAdminSessionId },
  });
}
