import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellerSessionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  const sellerSession =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUniqueOrThrow({
      where: { id: props.id },
    });

  return {
    id: sellerSession.id,
    shopping_mall_seller_id: sellerSession.shopping_mall_seller_id,
    ip: sellerSession.ip,
    href: sellerSession.href,
    referrer: sellerSession.referrer,
    created_at:
      sellerSession.created_at !== null
        ? toISOStringSafe(sellerSession.created_at)
        : "",
    expired_at:
      sellerSession.expired_at !== null
        ? toISOStringSafe(sellerSession.expired_at)
        : "",
  };
}
