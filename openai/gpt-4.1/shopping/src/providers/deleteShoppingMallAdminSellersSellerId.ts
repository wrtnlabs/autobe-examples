import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }

  // Step 2: Check for forbidden dependencies (products and orders must not exist for seller)
  const [productsCount, ordersCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.count({
      where: { seller: { id: props.sellerId } },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: { seller: { id: props.sellerId } },
    }),
  ]);
  if (productsCount > 0 || ordersCount > 0) {
    throw new HttpException(
      "Seller cannot be deleted: dependent products or orders exist.",
      409,
    );
  }

  // Step 3: Hard delete seller record
  await MyGlobal.prisma.shopping_mall_sellers.delete({
    where: { id: props.sellerId },
  });
}
