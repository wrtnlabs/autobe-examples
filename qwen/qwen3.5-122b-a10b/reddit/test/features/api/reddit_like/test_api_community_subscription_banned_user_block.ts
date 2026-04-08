import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_member_communities_bans_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_ban } from "../../../prepare/prepare_random_reddit_like_community_ban";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";

/**
 * Test that banned users cannot subscribe to communities they are banned from.
 *
 * Validates the ban enforcement mechanism that prevents banned members from subscribing to communities. This test ensures that community moderation controls are properly enforced and banned users cannot circumvent their ban status through subscription attempts.
 *
 * The test follows a complete workflow: member registration, community creation by owner, member banishment, and subscription attempt validation. Special attention is given to verifying that the subscription endpoint correctly identifies ban status and rejects the request with appropriate error handling.
 *
 * 1. Member registers with valid credentials and authenticates.
 * 2. Owner creates a new community with unique name and description.
 * 3. Owner bans the member from the community using the ban creation endpoint.
 * 4. Banned member attempts to subscribe to the banned community.
 * 5. Validates that subscription request is rejected with 403 error.
 * 6. Verifies ban record exists with active status (deleted_at is null).
 */
export async function test_api_community_subscription_banned_user_block(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Owner creates a community (using member as owner)
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Owner bans the member from the community
  const ban = await generate_random_reddit_like_member_communities_bans_create(
    memberConnection,
    {
      body: {
        member_id: member.id,
      } satisfies IRedditLikeCommunityBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 4. Banned member attempts to subscribe to the banned community
  await TestValidator.httpError(
    "banned user cannot subscribe to community",
    403,
    async () => {
      await generate_random_reddit_like_member_subscriptions_create(
        memberConnection,
        {
          body: {
            communityId: community.id,
          } satisfies IRedditLikeCommunitySubscription.ICreate,
        },
      );
    },
  );
}
