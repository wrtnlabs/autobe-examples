import { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_subscription_preference(
  input?:
    | DeepPartial<ICommunityPlatformSubscriptionPreference.ICreate>
    | undefined,
): ICommunityPlatformSubscriptionPreference.ICreate {
  return {
    communityPlatformSubscriptionId:
      input?.communityPlatformSubscriptionId ??
      typia.random<string & tags.Format<"uuid">>(),
    notifyNewPosts: input?.notifyNewPosts ?? true,
    notifyNewComments: input?.notifyNewComments ?? true,
    notifyMentions: input?.notifyMentions ?? true,
    showInHomeFeed: input?.showInHomeFeed ?? true,
    highlightNewContent: input?.highlightNewContent ?? false,
    autoExpandComments: input?.autoExpandComments ?? false,
    sortPostsBy: input?.sortPostsBy ?? null,
    sortCommentsBy: input?.sortCommentsBy ?? null,
  };
}
