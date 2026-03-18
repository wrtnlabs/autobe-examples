import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirstOrThrow({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    ...ShoppingMallReviewTransformer.select(),
  });
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_review_snapshots.create({
      data: {
        id: v4(),
        rating: review.rating,
        content: review.content,
        is_deleted: false,
        created_at: new Date(),
        review: {
          connect: { id: review.id },
        },
      },
    });
    await prisma.shopping_mall_reviews.update({
      where: { id: review.id },
      data: {
        ...(props.body.rating !== undefined && { rating: props.body.rating }),
        ...(props.body.content !== undefined && {
          content: props.body.content,
        }),
        updated_at: new Date(),
      },
    });
    return await prisma.shopping_mall_reviews.findUniqueOrThrow({
      where: { id: review.id },
      ...ShoppingMallReviewTransformer.select(),
    });
  });
  return await ShoppingMallReviewTransformer.transform(updated);
}
