import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallAdministratorSaleReviewVotesVoteId(props: {
  administrator: AdministratorPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleReviewVote> {
  const record =
    await MyGlobal.prisma.shopping_mall_sale_review_votes.findUnique({
      where: { id: props.voteId },
      select: {
        id: true,
        shopping_mall_product_review_id: true,
        voter_id: true,
        actor_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) throw new HttpException("Sale review vote not found", 404);
  return {
    id: record.id,
    shopping_mall_product_review_id: record.shopping_mall_product_review_id,
    voter_id: record.voter_id,
    actor_type: record.actor_type,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
