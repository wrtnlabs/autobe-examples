import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community_subscription } from "../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Generate a random community subscription for an authenticated member for E2E testing.
 *
 * Prepares random subscription data using the prepare function, then calls the creation endpoint
 * to subscribe the authenticated member to a community. The subscription grants the member
 * the ability to create posts within the subscribed community.
 *
 * The community_id is automatically generated as a valid UUID by default, but can be
 * overridden through the input parameter for specific test scenarios.
 */
export async function generate_random_reddit_clone_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunitySubscription.ICreate> | undefined;
  },
): Promise<IRedditCloneCommunitySubscription> {
  const prepared: IRedditCloneCommunitySubscription.ICreate =
    prepare_random_reddit_clone_community_subscription(props.body);
  return await api.functional.redditClone.member.subscriptions.create(
    connection,
    {
      body: prepared,
    },
  );
}
