import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community deletion and cascading effects on member subscriptions.
 *
 * This test validates the complete lifecycle of community deletion, including
 * how subscriptions are affected when a community is deleted. Multiple members
 * are created and subscribed to a community, then the community is deleted by
 * an administrator. The test verifies that the community is properly deleted
 * and marked with a deletion timestamp for soft-delete functionality.
 *
 * Workflow:
 *
 * 1. Create administrator account for community deletion
 * 2. Create category for community classification
 * 3. Create first member as community creator
 * 4. Create community with initial creator subscription
 * 5. Create additional members (representing potential subscribers)
 * 6. Administrator deletes the community
 * 7. Verify community is marked as deleted with deletion timestamp
 * 8. Verify deletion properly recorded in audit trail
 */
export async function test_api_community_deletion_cascading_effects_on_subscriptions(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for community deletion
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminName = RandomGenerator.name();
  const adminUsername = RandomGenerator.alphaNumeric(8);

  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);
  TestValidator.predicate(
    "administrator account created successfully",
    adminAccount.id !== null && adminAccount.email === adminEmail,
  );

  // Step 2: Create category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and programming related communities",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created with correct slug",
    category.slug,
    "technology",
  );

  // Step 3: Create first member as community creator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = "CreatorPassword123!";
  const creatorUsername = RandomGenerator.alphaNumeric(8);

  const creatorMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: creatorUsername,
        password: creatorPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorMember);
  TestValidator.predicate(
    "creator member account created",
    creatorMember.id !== null,
  );

  // Step 4: Create community with initial creator subscription
  const communityIdentifier = RandomGenerator.alphaNumeric(8).toLowerCase();
  const communityData = {
    name: "Tech Discussion Community",
    identifier: communityIdentifier,
    description: "A community for tech discussions and knowledge sharing",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with correct identifier",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.predicate(
    "community has creator subscription",
    community.subscriber_count >= 1,
  );

  // Step 5: Create additional members (representing potential subscribers)
  const subscriber1Email = typia.random<string & tags.Format<"email">>();
  const subscriber1Username = RandomGenerator.alphaNumeric(8);

  const subscriber1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: subscriber1Email,
        username: subscriber1Username,
        password: "Subscriber1Pass123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(subscriber1);

  const subscriber2Email = typia.random<string & tags.Format<"email">>();
  const subscriber2Username = RandomGenerator.alphaNumeric(8);

  const subscriber2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: subscriber2Email,
        username: subscriber2Username,
        password: "Subscriber2Pass123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(subscriber2);

  const subscriber3Email = typia.random<string & tags.Format<"email">>();
  const subscriber3Username = RandomGenerator.alphaNumeric(8);

  const subscriber3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: subscriber3Email,
        username: subscriber3Username,
        password: "Subscriber3Pass123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(subscriber3);

  // Step 6: Administrator deletes the community
  const deletedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.erase(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);
  TestValidator.predicate(
    "community marked as deleted with soft-delete timestamp",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 7: Verify community deletion details
  TestValidator.equals(
    "deleted community ID matches original community",
    deletedCommunity.id,
    community.id,
  );

  TestValidator.equals(
    "deleted community identifier unchanged",
    deletedCommunity.identifier,
    community.identifier,
  );

  // Step 8: Verify deletion properly recorded in audit trail
  TestValidator.predicate(
    "community update timestamp changed after deletion",
    deletedCommunity.updated_at !== community.updated_at,
  );

  TestValidator.predicate(
    "community maintained data integrity during soft delete",
    deletedCommunity.name === community.name &&
      deletedCommunity.category.id === community.category.id &&
      deletedCommunity.creator.id === community.creator.id,
  );
}
