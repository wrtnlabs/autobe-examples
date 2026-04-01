import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdAnalytics(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct.IAnalytic> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_product_id: props.productId,
      status: {
        notIn: ["cancelled", "refunded"],
      },
      deleted_at: null,
    },
    select: {
      quantity: true,
      price: true,
    },
  });
  let totalUnitsSold = 0;
  let totalRevenue = 0;
  for (const item of orderItems) {
    totalUnitsSold += item.quantity;
    totalRevenue += item.quantity * item.price;
  }
  const reviewStats = await MyGlobal.prisma.shopping_mall_reviews.groupBy({
    by: ["product_id"],
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _count: {
      id: true,
    },
    _avg: {
      rating: true,
    },
  });
  const reviewCount = reviewStats[0]?._count.id ?? 0;
  const averageRating = reviewStats[0]?._avg.rating ?? null;
  return {
    totalUnitsSold: totalUnitsSold satisfies number & tags.Type<"int32">,
    totalRevenue: totalRevenue,
    reviewCount: reviewCount satisfies number & tags.Type<"int32">,
    averageRating: averageRating satisfies
      | (number & tags.Minimum<1> & tags.Maximum<5>)
      | null,
  };
}
