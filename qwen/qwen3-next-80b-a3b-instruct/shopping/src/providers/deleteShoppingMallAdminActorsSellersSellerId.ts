import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminActorsSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Admin is already authorized by Decorator and Provider - trust the payload
  // No need to re-verify admin status as it's guaranteed by the auth pipeline

  // Perform hard delete of seller record
  await MyGlobal.prisma.shopping_mall_sellers.delete({
    where: {
      id: props.sellerId,
    },
  });

  // Remove all associated seller sessions
  await MyGlobal.prisma.shopping_mall_seller_sessions.deleteMany({
    where: {
      shopping_mall_seller_id: props.sellerId,
    },
  });

  // Return void as per specification
  return;
}
