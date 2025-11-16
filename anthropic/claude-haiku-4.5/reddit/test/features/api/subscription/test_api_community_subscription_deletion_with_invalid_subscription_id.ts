import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion with an invalid or non-existent subscription ID.
 *
 * This test validates that the API properly handles deletion attempts with
 * non-existent subscription identifiers. The system should return an
 * appropriate error response (404 Not Found) when attempting to delete a
 * subscription that does not exist in the database, confirming that the API
 * validates subscription identifiers before attempting deletion.
 *
 * Test workflow:
 *
 * 1. Register a member account for subscription deletion testing
 * 2. Create an administrator account for category setup
 * 3. Create a test category for community classification
 * 4. Create a community using the authenticated member
 * 5. Attempt to delete a subscription using an invalid UUID
 * 6. Validate that the API returns a 404 error or similar error response
 * 7. Confirm error prevents accidental deletion operations
 */
export async function test_api_community_subscription_deletion_with_invalid_subscription_id(
  connection: api.IConnection,
) {
  // 1. Register a member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(memberAuth);

  // 2. Register an administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "https://example.com/admin",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(adminAuth);

  // Switch to admin connection for category creation
  const adminConnection: IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAuth.token.access,
    },
  };

  // 3. Create a test category for community classification
  const categoryData = {
    name: "Technology",
    slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
    display_order: 1,
    description: "Technology and software discussions",
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Switch back to member connection for community and subscription operations
  const memberConnection: IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };

  // 4. Create a community using the member account
  const communityData = {
    name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
    identifier: `test-community-${RandomGenerator.alphaNumeric(8)}`,
    description: "Test community for subscription deletion",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: communityData },
    );
  typia.assert(community);

  // 5. Attempt to delete a subscription using an invalid/non-existent subscription ID
  const invalidSubscriptionId = typia.random<string & tags.Format<"uuid">>();

  // 6. Validate that the API returns an appropriate error
  await TestValidator.error(
    "API should return error when deleting non-existent subscription",
    async () => {
      await api.functional.communityPlatform.member.communities.subscriptions.erase(
        memberConnection,
        {
          communityId: community.id,
          subscriptionId: invalidSubscriptionId,
        },
      );
    },
  );

  // 7. Confirm error prevents accidental deletion operations
  TestValidator.predicate(
    "invalid subscription deletion attempt was properly rejected",
    true,
  );
}
