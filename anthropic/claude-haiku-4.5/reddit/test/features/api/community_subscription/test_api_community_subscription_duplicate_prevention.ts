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
 * Test that duplicate subscriptions are prevented.
 *
 * A member subscribes to a community successfully, then attempts to subscribe
 * to the same community again. The system should reject the duplicate
 * subscription with an error indicating that the member is already subscribed,
 * validating the unique constraint on (community_id, member_id) pairs and
 * preventing data inconsistencies from duplicate memberships.
 *
 * Setup flow:
 *
 * 1. Create administrator and category (infrastructure setup)
 * 2. Register and authenticate a member
 * 3. Create a community as the authenticated member
 * 4. Subscribe to the community (initial subscription - should succeed)
 * 5. Attempt duplicate subscription (should fail with 409 Conflict)
 */
export async function test_api_community_subscription_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for infrastructure setup
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = `Pass${RandomGenerator.alphaNumeric(8)}${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: `Test Admin ${RandomGenerator.alphaNumeric(4)}`,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const categorySlug = `cat-${RandomGenerator.alphaNumeric(12)}`;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register and authenticate a member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = `Pass${RandomGenerator.alphaNumeric(8)}${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      password: memberPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community as the authenticated member
  const communityIdentifier = `comm${RandomGenerator.alphaNumeric(12)}`;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Subscribe to the community (initial subscription - should succeed)
  const initialSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(initialSubscription);
  TestValidator.equals(
    "initial subscription community_id matches",
    initialSubscription.community.id,
    community.id,
  );

  // Step 6: Attempt duplicate subscription (should fail with 409 Conflict)
  await TestValidator.error(
    "duplicate subscription should be rejected with conflict error",
    async () => {
      await api.functional.communityPlatform.member.communities.subscriptions.create(
        connection,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    },
  );
}
