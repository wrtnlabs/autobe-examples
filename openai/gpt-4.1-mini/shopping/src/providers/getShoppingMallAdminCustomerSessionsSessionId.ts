import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCustomerSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  const { sessionId } = props;

  // Fetch the session record by its primary key
  const record =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: sessionId },
    });

  if (record === null) {
    throw new HttpException(
      `Customer session not found for id: ${sessionId}`,
      404,
    );
  }

  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    ip: record.ip,
    href: record.href,
    referrer: record.referrer,
    created_at: toISOStringSafe(record.created_at),
    expired_at:
      record.expired_at !== null && record.expired_at !== undefined
        ? toISOStringSafe(record.expired_at)
        : null,
  };
}
