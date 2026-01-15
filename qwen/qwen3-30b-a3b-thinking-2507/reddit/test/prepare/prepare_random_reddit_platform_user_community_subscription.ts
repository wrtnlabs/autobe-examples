import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserCommunitySubscription";
export function prepare_random_reddit_platform_user_community_subscription(
  input?: DeepPartial<IRedditPlatformUserCommunitySubscription.ICreate>,
): IRedditPlatformUserCommunitySubscription.ICreate {
  return {
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
