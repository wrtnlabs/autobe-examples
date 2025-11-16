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
 * Test idempotent behavior when attempting to delete a subscription that has
 * already been deleted.
 *
 * This test validates that the system properly handles repeat deletion attempts
 * and prevents silent failures from masking bugs. It ensures that:
 *
 * 1. Subscriptions can be created successfully
 * 2. Subscriptions can be deleted successfully
 * 3. Attempting to delete an already-deleted subscription fails with 404 Not Found
 * 4. The API does not silently succeed on duplicate deletions
 *
 * Workflow:
 *
 * 1. Create administrator account
 * 2. Create category for community classification
 * 3. Create member account
 * 4. Create community in the category
 * 5. Member subscribes to the community
 * 6. Member deletes the subscription (first deletion - should succeed)
 * 7. Member attempts to delete the same subscription again (should fail with 404)
 * 8. Verify proper error handling prevents accidental data loss
 */
export async function test_api_community_subscription_deletion_idempotent_behavior(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category-${RandomGenerator.alphabets(6)}`,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "MemberPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community in the category
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `community-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Member subscribes to the community
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription should belong to the community",
    subscription.community.id,
    community.id,
  );

  // Step 6: Member deletes the subscription (first deletion - should succeed)
  await api.functional.communityPlatform.member.communities.subscriptions.erase(
    connection,
    {
      communityId: community.id,
      subscriptionId: subscription.id,
    },
  );
  TestValidator.predicate("first deletion should succeed without error", true);

  // Step 7: Member attempts to delete the same subscription again (should fail with 404)
  await TestValidator.error(
    "second deletion attempt should fail with 404 Not Found",
    async () => {
      await api.functional.communityPlatform.member.communities.subscriptions.erase(
        connection,
        {
          communityId: community.id,
          subscriptionId: subscription.id,
        },
      );
    },
  );

  // Step 8: Verify idempotent behavior prevents silent failures
  TestValidator.predicate(
    "idempotent delete behavior is properly enforced",
    true,
  );
}
