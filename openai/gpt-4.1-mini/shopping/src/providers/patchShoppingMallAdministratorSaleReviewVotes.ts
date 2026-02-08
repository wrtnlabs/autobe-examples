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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSaleReviewVotes(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleReviewVote.IRequest;
}): Promise<IPageIShoppingMallSaleReviewVote.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_review_votesWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_review_votes.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "asc" }],
    select: {
      id: true,
      shopping_mall_product_review_id: true,
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
    data: data.map((item) => ({
      id: item.id,
      review_id: item.shopping_mall_product_review_id,
      voter_id: item.voter_id,
      actor_type: item.actor_type,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
