import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerSessionTransformer } from "../transformers/ShoppingMallSellerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSellersSellerIdSessionsSessionId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        shopping_mall_seller_id: props.sellerId,
      },
      ...ShoppingMallSellerSessionTransformer.select(),
    });
  return ShoppingMallSellerSessionTransformer.transform(session);
}
