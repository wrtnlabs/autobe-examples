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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSaleReviewVoteTransformer } from "../transformers/ShoppingMallSaleReviewVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerSalesSaleIdReviewVotes(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReviewVote.ICreate;
}): Promise<IShoppingMallSaleReviewVote> {
  // 1. Check sale existence
  await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { id: true },
  });
  // 2. Check review existence - cannot check sale relation as it doesn't exist
  const review =
    await MyGlobal.prisma.shopping_mall_product_reviews.findUniqueOrThrow({
      where: { id: props.body.shoppingMallProductReviewId },
      select: { id: true },
    });
  // 3. Prepare voter entity from customer payload
  const voter = { id: props.customer.id };
  // 4. Prepare creation data using collector
  const data = await ShoppingMallSaleReviewVoteCollector.collect({
    body: props.body,
    voter,
  });
  // 5. Use transaction for uniqueness check and creation
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Uniqueness check
    const existing = await tx.shopping_mall_sale_review_votes.findUnique({
      where: {
        shopping_mall_product_review_id_actor_type_voter_id: {
          shopping_mall_product_review_id:
            props.body.shoppingMallProductReviewId,
          actor_type: props.body.actorType,
          voter_id: props.customer.id,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new HttpException("Vote already exists", 409);
    }
    // Create vote
    const created = await tx.shopping_mall_sale_review_votes.create({
      data,
      ...ShoppingMallSaleReviewVoteTransformer.select(),
    });
    // Transform response DTO
    return await ShoppingMallSaleReviewVoteTransformer.transform(created);
  });
}
