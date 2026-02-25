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

export async function deleteShoppingMallSellerSalesSaleIdReviewVotesVoteId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.shopping_mall_sale_review_votes.findUnique(
    {
      where: { id: props.voteId },
    },
  );
  if (!vote) throw new HttpException("Vote not found", 404);
  const review = await MyGlobal.prisma.shopping_mall_sale_reviews.findUnique({
    where: { id: vote.shopping_mall_product_review_id },
  });
  if (!review) throw new HttpException("Review not found", 404);
  if (review.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Vote does not belong to the specified sale", 404);
  }
  if (vote.voter_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_sale_review_votes.delete({
    where: { id: props.voteId },
  });
}
