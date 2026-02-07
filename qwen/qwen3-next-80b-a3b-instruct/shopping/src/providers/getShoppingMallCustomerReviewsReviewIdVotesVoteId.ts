import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
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

export async function getShoppingMallCustomerReviewsReviewIdVotesVoteId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewVote> {
  const vote = await MyGlobal.prisma.shopping_mall_review_votes.findUnique({
    where: { id: props.voteId, shopping_mall_review_id: props.reviewId },
  });
  if (!vote) throw new HttpException("Vote not found", 404);
  return {
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
