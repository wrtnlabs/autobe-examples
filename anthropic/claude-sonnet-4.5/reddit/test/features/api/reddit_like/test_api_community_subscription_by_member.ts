import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test the complete workflow of a member subscribing to a public community.
 *
 * This test validates the core community subscription functionality by:
 *
 * 1. Creating a new member account through registration to establish an
 *    authenticated user context
 * 2. Creating a public community to serve as the subscription target
 * 3. Executing the subscription operation to create the relationship between the
 *    member and the community
 * 4. Validating that the subscription record is created successfully with correct
 *    member and community IDs
 * 5. Verifying that the subscription timestamp is recorded properly
 *
 * The test ensures the subscription mechanism works correctly for the common
 * case of members joining public communities, which is fundamental to the
 * platform's content distribution system.
 */
export async function test_api_community_subscription_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a public community
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Subscribe to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(subscription);

  // Step 4: Validate subscription record
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community_id,
    community.id,
  );

  TestValidator.equals(
    "subscription member ID matches",
    subscription.member_id,
    member.id,
  );

  TestValidator.predicate(
    "subscription timestamp is recorded",
    subscription.subscribed_at !== null &&
      subscription.subscribed_at !== undefined,
  );
}
