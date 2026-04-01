import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformCustomerAtSummaryTransformer } from "../transformers/MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformOrderItemAtSummaryTransformer } from "../transformers/MallPlatformOrderItemAtSummaryTransformer";
import { MallPlatformProductAtSummaryTransformer } from "../transformers/MallPlatformProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformProductsProductIdReviewsReviewId(props: {
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformReview> {
  const review = await MyGlobal.prisma.mall_platform_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      rating: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      product_id: true,
      customer: MallPlatformCustomerAtSummaryTransformer.select(),
      orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
      product: MallPlatformProductAtSummaryTransformer.select(),
    },
  });
  if (review.product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: review.id,
    customer: await MallPlatformCustomerAtSummaryTransformer.transform(
      review.customer,
    ),
    orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(
      review.orderItem,
    ),
    product: await MallPlatformProductAtSummaryTransformer.transform(
      review.product,
    ),
    rating: review.rating,
    content: review.content,
    createdAt: review.created_at.toISOString(),
    updatedAt: review.updated_at.toISOString(),
    deletedAt: review.deleted_at?.toISOString() ?? null,
  };
}
