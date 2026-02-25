import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleReviewVoteCollector } from "../collectors/ShoppingMallSaleReviewVoteCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleReviewVoteTransformer } from "../transformers/ShoppingMallSaleReviewVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSalesSaleIdReviewVotes(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReviewVote.ICreate;
}): Promise<IShoppingMallSaleReviewVote> {
  // Verify sale exists
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { id: true },
  });
  if (!sale) {
    throw new HttpException(`Sale with id ${props.saleId} not found`, 404);
  }
  // Verify that the review exists
  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: props.body.shoppingMallProductReviewId },
      select: { id: true, shopping_mall_order_item_id: true },
    },
  );
  if (!review) {
    throw new HttpException("Review does not exist", 400);
  }
  // Verify the review belongs to the sale by cross checking shopping_mall_order_item -> shopping_mall_order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: review.shopping_mall_order_item_id },
    select: { shopping_mall_order_id: true },
  });
  if (!orderItem) {
    throw new HttpException("Order item related to review not found", 400);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.shopping_mall_order_id },
    select: { shopping_mall_customer_id: true },
  });
  if (!order) {
    throw new HttpException(
      "Review does not belong to the specified sale",
      400,
    );
  }
  // Use transaction to create vote ensuring uniqueness
  const createdVote = await MyGlobal.prisma.$transaction(async (tx) => {
    const existingVote = await tx.shopping_mall_sale_review_votes.findUnique({
      where: {
        shopping_mall_product_review_id_actor_type_voter_id: {
          shopping_mall_product_review_id:
            props.body.shoppingMallProductReviewId,
          actor_type: "seller",
          voter_id: props.seller.id,
        },
      },
    });
    if (existingVote) {
      throw new HttpException("Seller has already voted this review", 409);
    }
    const data = await ShoppingMallSaleReviewVoteCollector.collect({
      body: {
        ...props.body,
        voterId: props.seller.id,
        actorType: "seller",
      },
      voter: props.seller,
    });
    return await tx.shopping_mall_sale_review_votes.create({
      data,
      ...ShoppingMallSaleReviewVoteTransformer.select(),
    });
  });
  // Transform the created vote to the response DTO
  return await ShoppingMallSaleReviewVoteTransformer.transform(createdVote);
}
