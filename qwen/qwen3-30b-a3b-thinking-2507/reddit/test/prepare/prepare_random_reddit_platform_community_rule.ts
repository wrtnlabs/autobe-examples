import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
export function prepare_random_reddit_platform_community_rule(
  input?: DeepPartial<IRedditPlatformCommunityRule.ICreate>,
): IRedditPlatformCommunityRule.ICreate {
  return {
    ruleText:
      input?.ruleText ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
  };
}
