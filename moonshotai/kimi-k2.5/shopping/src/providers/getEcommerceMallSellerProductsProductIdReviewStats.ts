import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallSellerProductsProductIdReviewStats(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductReviewStat> {
  // Verify the product exists and belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get aggregate statistics from non-deleted reviews
  const aggregateResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _avg: { rating: true },
      _count: { id: true },
    });
  // Get distribution of ratings
  const distributionResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  // Build distribution map (default all to 0)
  const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const item of distributionResult) {
    const key = String(item.rating) as "1" | "2" | "3" | "4" | "5";
    if (key !== undefined && typeof distribution[key] === "number") {
      distribution[key] = item._count.id;
    }
  }
  const totalCount = aggregateResult._count.id ?? 0;
  const avgRating = aggregateResult._avg.rating ?? 0;
  return {
    averageRating: Math.round(avgRating * 10) / 10,
    totalCount,
    distribution,
  };
}
