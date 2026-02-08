import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReviewVote";
import { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
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

export async function patchShoppingMallSellerSaleReviewVotes(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleReviewVote.IRequest;
}): Promise<IPageIShoppingMallSaleReviewVote.ISummary> {
  // Default page and limit as IRequest lacks those properties
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    // Removed filters on sale_review_id, voter_id, actor_type as they don't exist on IRequest
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_review_votes.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      voter_id: true,
      actor_type: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_review_votes.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((vote) => ({
      id: vote.id,
      voter_id: vote.voter_id,
      actor_type: vote.actor_type,
      created_at:
        vote.created_at === null ? null : toISOStringSafe(vote.created_at),
      updated_at:
        vote.updated_at === null ? null : toISOStringSafe(vote.updated_at),
    })),
  };
}
