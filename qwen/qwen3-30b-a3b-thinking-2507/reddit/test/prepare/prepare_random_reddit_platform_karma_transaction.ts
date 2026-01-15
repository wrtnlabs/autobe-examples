import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformKarmaTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaTransaction";
export function prepare_random_reddit_platform_karma_transaction(
  input?: DeepPartial<IRedditPlatformKarmaTransaction.ICreate>,
): IRedditPlatformKarmaTransaction.ICreate {
  return {
    amount:
      input?.amount ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    type:
      input?.type ?? RandomGenerator.pick(["positive", "negative"] as const),
    source:
      input?.source ??
      RandomGenerator.pick([
        "post_creation",
        "comment_upvote",
        "comment_downvote",
        "community_rule_benefit",
        "community_rule_violation",
        "manual_adjustment",
      ] as const),
    reason:
      input?.reason ??
      `${RandomGenerator.name(1)} on ${RandomGenerator.name(2)} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
  };
}
