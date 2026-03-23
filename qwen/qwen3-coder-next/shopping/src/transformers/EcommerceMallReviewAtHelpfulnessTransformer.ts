import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export function select() {
  return {
    select: {
      id: true,
      created_at: true,
      customer_id: true,
      review_id: true,
    },
  } satisfies Prisma.ecommerce_mall_review_helpfulness_votesFindManyArgs;
}
