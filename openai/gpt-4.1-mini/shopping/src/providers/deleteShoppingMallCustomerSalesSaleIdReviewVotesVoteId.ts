import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerSalesSaleIdReviewVotesVoteId(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the vote, throw 404 if not found
  const vote =
    await MyGlobal.prisma.shopping_mall_sale_review_votes.findUniqueOrThrow({
      where: { id: props.voteId },
    });
  // Find the review linked to vote, throw 404 if not found
  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: vote.shopping_mall_product_review_id },
    },
  );
  if (!review) {
    throw new HttpException("Vote not found", 404);
  }
  // Find the sale_unit linked to product_variant to check sale ownership
  const saleUnit = await MyGlobal.prisma.shopping_mall_sale_units.findFirst({
    where: { id: review.shopping_mall_product_variant_id },
    select: { shopping_mall_sale_id: true },
  });
  if (!saleUnit || saleUnit.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Vote not found", 404);
  }
  // Authorization check: only voter or admin can delete
  if (vote.voter_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the vote
  await MyGlobal.prisma.shopping_mall_sale_review_votes.delete({
    where: { id: props.voteId },
  });
}
