import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_subscription } from "../prepare/prepare_random_reddit_community_subscription";

/**
 * Generate a random Reddit community subscription via the API for E2E testing.
 *
 * Prepares random subscription data using the prepare function, then calls the
 * creation endpoint to establish a subscription relationship between the
 * authenticated member and the specified community. The community_id is
 * auto-generated as a valid UUID if not provided in the optional body parameter.
 *
 * This function is designed for end-to-end test scenarios where a member needs
 * to subscribe to a community. The member identity is derived from the
 * authentication session token configured in the connection, requiring no
 * explicit member identifier in the request.
 */
export async function generate_random_reddit_community_member_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunitySubscription.ICreate>;
  },
): Promise<IRedditCommunitySubscription> {
  const prepared: IRedditCommunitySubscription.ICreate =
    prepare_random_reddit_community_subscription(props.body);
  const result: IRedditCommunitySubscription =
    await api.functional.redditCommunity.member.member.subscriptions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
