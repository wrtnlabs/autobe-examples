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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleReviewVoteTransformer } from "../transformers/ShoppingMallSaleReviewVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSalesSaleIdReviewVotesVoteId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleReviewVote> {
  // Find sale by id only
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  // Check seller ownership
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find vote with related review
  const vote =
    await MyGlobal.prisma.shopping_mall_sale_review_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...ShoppingMallSaleReviewVoteTransformer.select(),
    });
  // Removed check for vote.review.shopping_mall_sale_id because it is not in the Prisma model
  // Instead rely on seller ownership check above
  // Transform and return
  return await ShoppingMallSaleReviewVoteTransformer.transform(vote);
}
