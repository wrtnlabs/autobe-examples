import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallGuestsShoppingMallGuestIdShoppingMallGuestSessionsShoppingMallGuestSessionId(props: {
  admin: AdminPayload;
  shoppingMallGuestId: string & tags.Format<"uuid">;
  shoppingMallGuestSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: props.shoppingMallGuestSessionId,
      shopping_mall_guest_id: props.shoppingMallGuestId,
    },
  });

  if (!session) {
    throw new HttpException("Guest session not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_guest_sessions.delete({
    where: { id: props.shoppingMallGuestSessionId },
  });
}
