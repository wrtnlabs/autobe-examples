import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminBuyersBuyerIdSessionsSessionId(props: {
  admin: AdminPayload;
  buyerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.shopping_mall_buyer_sessions.findUnique(
    {
      where: { id: props.sessionId },
    },
  );

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.shopping_mall_buyer_id !== props.buyerId) {
    throw new HttpException(
      "Session does not belong to the specified buyer",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_buyer_sessions.delete({
    where: { id: props.sessionId },
  });
}
