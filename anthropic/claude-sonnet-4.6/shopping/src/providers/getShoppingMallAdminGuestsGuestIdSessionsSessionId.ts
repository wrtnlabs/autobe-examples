import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallGuestSessionTransformer } from "../transformers/ShoppingMallGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminGuestsGuestIdSessionsSessionId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallGuestSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        shopping_mall_guest_id: props.guestId,
      },
      ...ShoppingMallGuestSessionTransformer.select(),
    });
  return await ShoppingMallGuestSessionTransformer.transform(session);
}
