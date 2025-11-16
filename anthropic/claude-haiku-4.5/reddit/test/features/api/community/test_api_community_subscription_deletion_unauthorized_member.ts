import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test unauthorized community subscription deletion.
 *
 * Validates that a member cannot delete another member's subscription to a
 * community. This test ensures proper authorization boundaries: members can
 * only manage their own subscriptions and cannot interfere with other members'
 * community memberships.
 *
 * Test workflow:
 *
 * 1. Create administrator account and authentication
 * 2. Administrator creates a category for community classification
 * 3. Create first member (Member A - community creator)
 * 4. Create second member (Member B - unauthorized accessor)
 * 5. Member A creates a community (auto-subscribed at creation)
 * 6. Member B subscribes to the community
 * 7. Member A attempts to delete Member B's subscription (should fail)
 * 8. Verify Member B can delete their own subscription (authorization working)
 */
export async function test_api_community_subscription_deletion_unauthorized_member(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Update connection with admin token
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin.token.access}`,
    },
  };

  // Step 2: Administrator creates a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Test Category",
          slug: `test_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Category for testing subscription authorization",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create Member A (community creator)
  const memberAEmail = `member_a_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAPassword = RandomGenerator.alphaNumeric(12);
  const memberAJoined: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        username: `member_a_${RandomGenerator.alphaNumeric(8)}`,
        password: memberAPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAJoined);

  // Step 4: Create Member B (unauthorized accessor)
  const memberBEmail = `member_b_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberBPassword = RandomGenerator.alphaNumeric(12);
  const memberBJoined: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        username: `member_b_${RandomGenerator.alphaNumeric(8)}`,
        password: memberBPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberBJoined);

  // Create connection for Member A
  const memberAConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${memberAJoined.token.access}`,
    },
  };

  // Step 5: Member A creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `test_${RandomGenerator.alphaNumeric(6)}`,
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community creator is auto-subscribed",
    community.subscriber_count >= 1,
  );

  // Create connection for Member B
  const memberBConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${memberBJoined.token.access}`,
    },
  };

  // Step 6: Member B subscribes to the community
  const memberBSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(memberBSubscription);
  TestValidator.equals(
    "member B subscription belongs to correct community",
    memberBSubscription.community.id,
    community.id,
  );

  // Step 7: Member A attempts to delete Member B's subscription - should fail
  await TestValidator.error(
    "member A cannot delete member B's subscription",
    async () => {
      await api.functional.communityPlatform.member.communities.subscriptions.erase(
        memberAConnection,
        {
          communityId: community.id,
          subscriptionId: memberBSubscription.id,
        },
      );
    },
  );

  // Step 8: Verify that Member B can delete their own subscription
  // This confirms the authorization is working correctly
  await api.functional.communityPlatform.member.communities.subscriptions.erase(
    memberBConnection,
    {
      communityId: community.id,
      subscriptionId: memberBSubscription.id,
    },
  );

  TestValidator.predicate(
    "member B successfully deleted their own subscription",
    true,
  );
}
