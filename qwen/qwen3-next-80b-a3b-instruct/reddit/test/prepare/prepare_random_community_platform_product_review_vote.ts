import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReviewVote";
export function prepare_random_community_platform_product_review_vote(
  input?: DeepPartial<ICommunityPlatformProductReviewVote.ICreate> | undefined,
): ICommunityPlatformProductReviewVote.ICreate {
  return {
    value: input?.value ?? RandomGenerator.pick([1, -1] as const),
    vote_type:
      input?.vote_type ??
      (input?.value === 1
        ? "up"
        : input?.value === -1
          ? "down"
          : RandomGenerator.pick(["up", "down"] as const)),
  };
}
