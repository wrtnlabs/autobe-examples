import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_community_subscription(
  input?: DeepPartial<IRedditPlatformCommunitySubscription.ICreate>,
): IRedditPlatformCommunitySubscription.ICreate {
  return {
    reddit_platform_community_id:
      input?.reddit_platform_community_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
