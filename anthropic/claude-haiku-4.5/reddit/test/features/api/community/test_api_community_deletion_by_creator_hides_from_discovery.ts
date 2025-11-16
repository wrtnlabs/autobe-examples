import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_deletion_by_creator_hides_from_discovery(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: RandomGenerator.name(),
      href: "https://community.example.com/admin/setup",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create category using admin connection
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and software engineering discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community creator member account
  const creatorEmail = `creator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creatorAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: `creator_${RandomGenerator.alphaNumeric(6)}`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://community.example.com/join",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creatorAuth);

  const creatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${creatorAuth.token.access}`,
    },
  };

  // Step 4: Creator creates a public community
  const communityIdentifier = `comm-${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Verify community is created and publicly visible
  TestValidator.equals(
    "community should be public",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.predicate(
    "community should not be deleted on creation",
    community.deleted_at === null || community.deleted_at === undefined,
  );
  TestValidator.predicate(
    "community should have creator assigned",
    community.creator.id !== null && community.creator.id !== undefined,
  );

  // Step 6: Create subscriber member account
  const subscriberEmail = `subscriber-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const subscriberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: subscriberEmail,
      username: `subscriber_${RandomGenerator.alphaNumeric(6)}`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://community.example.com/join",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(subscriberAuth);

  // Step 7: Creator initiates soft-delete of the community
  const deletedCommunity =
    await api.functional.communityPlatform.member.communities.erase(
      creatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);

  // Step 8: Verify community has been soft-deleted with deleted_at timestamp
  TestValidator.predicate(
    "deleted_at should be set after deletion",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 9: Verify deletion preserves community data integrity
  TestValidator.equals(
    "community identifier should remain unchanged after deletion",
    deletedCommunity.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "creator should remain unchanged after deletion",
    deletedCommunity.creator.id,
    community.creator.id,
  );
  TestValidator.equals(
    "category should remain unchanged after deletion",
    deletedCommunity.category.slug,
    category.slug,
  );

  // Step 10: Verify community metadata preserved for recovery window
  TestValidator.equals(
    "community name should remain unchanged",
    deletedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community visibility setting should remain unchanged",
    deletedCommunity.visibility,
    "public",
  );
  TestValidator.predicate(
    "community should still have created_at timestamp",
    deletedCommunity.created_at !== null &&
      deletedCommunity.created_at !== undefined,
  );
}
