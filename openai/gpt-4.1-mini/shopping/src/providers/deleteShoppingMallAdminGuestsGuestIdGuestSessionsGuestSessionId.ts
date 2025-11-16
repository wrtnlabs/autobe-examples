import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminGuestsGuestIdGuestSessionsGuestSessionId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  guestSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findUnique(
    {
      where: {
        id: props.guestSessionId,
      },
    },
  );

  if (!session || session.shopping_mall_guest_id !== props.guestId) {
    throw new HttpException("Guest session not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_guest_sessions.delete({
    where: { id: props.guestSessionId },
  });
}
