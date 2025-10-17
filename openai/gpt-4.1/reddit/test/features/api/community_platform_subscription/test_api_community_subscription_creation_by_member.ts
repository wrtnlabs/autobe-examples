import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Verify community membership subscription logic for newly registered members.
 *
 * This test covers the workflow where a new member joins the platform and
 * subscribes to an existing community as defined by the business rules:
 *
 * 1. Register a new platform member (email & password)
 * 2. Authenticate: retrieve the authorization token
 * 3. Create a new community as that member
 * 4. Subscribe the member to that (active) community (success expected)
 * 5. Attempt to subscribe to a banned community (should fail)
 * 6. Attempt to subscribe to a non-existent community (should fail)
 * 7. Validate the subscription links the member and the community, and check
 *    timestamps and non-null fields
 * 8. Test that repeated subscription to the same community does not create
 *    duplicates or is forbidden (business rule)
 * 9. (If quota business rule applies) Attempt to exceed the allowed number of
 *    community subscriptions for this member and check proper failure.
 *
 * Note: Steps that rely on out-of-scope or non-existent APIs are omitted; only
 * test what the available endpoints and DTOs support.
 */
export async function test_api_community_subscription_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a new community as that member
  const communityName = RandomGenerator.alphaNumeric(10);
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: communitySlug,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Subscribe to the community (success path)
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription member_id equals authorized member ID",
    subscription.member_id,
    member.id,
  );
  TestValidator.equals(
    "subscription community_id equals target community",
    subscription.community_id,
    community.id,
  );

  // 4. Subscribe again to the same community (should not create duplicate or should error depending on business rule)
  await TestValidator.error(
    "duplicate subscription to same community should fail",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.create(
        connection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformSubscription.ICreate,
        },
      );
    },
  );

  // 5. Attempt to subscribe to a non-existent community
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "subscription to nonexistent community should fail",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.create(
        connection,
        {
          body: {
            community_id: fakeCommunityId,
          } satisfies ICommunityPlatformSubscription.ICreate,
        },
      );
    },
  );
}
