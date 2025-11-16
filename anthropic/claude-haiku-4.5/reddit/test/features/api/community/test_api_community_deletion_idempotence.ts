import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test idempotent community deletion behavior.
 *
 * Validates that deleting an already-deleted community is handled gracefully.
 * Verifies that multiple deletion attempts don't cause errors and the community
 * remains in deleted state with consistent deleted_at timestamp.
 *
 * Workflow:
 *
 * 1. Create member account (community creator)
 * 2. Create category for community classification
 * 3. Create community with the authenticated member as creator
 * 4. Delete community (soft-delete sets deleted_at)
 * 5. Delete the same community again (idempotent operation)
 * 6. Verify deleted_at timestamp is consistent
 * 7. Verify community remains deleted after multiple deletion attempts
 */
export async function test_api_community_deletion_idempotence(
  connection: api.IConnection,
) {
  // Step 1: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreate = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphabets(10),
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreate,
  });
  typia.assert(member);

  // Step 2: Create category for community classification
  const categoryCreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(6).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community with authenticated member as creator
  const communityCreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.content({ paragraphs: 1 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created successfully",
    community.deleted_at,
    null,
  );

  // Step 4: Delete community (soft-delete sets deleted_at)
  const firstDeletion =
    await api.functional.communityPlatform.member.communities.erase(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(firstDeletion);
  TestValidator.predicate(
    "community has deleted_at timestamp after first deletion",
    firstDeletion.deleted_at !== null && firstDeletion.deleted_at !== undefined,
  );

  // Store the deleted_at timestamp from first deletion for comparison
  const firstDeletedAt = firstDeletion.deleted_at;

  // Step 5: Delete the same community again (idempotent operation)
  const secondDeletion =
    await api.functional.communityPlatform.member.communities.erase(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(secondDeletion);
  TestValidator.predicate(
    "community has deleted_at timestamp after second deletion",
    secondDeletion.deleted_at !== null &&
      secondDeletion.deleted_at !== undefined,
  );

  // Step 6: Verify deleted_at timestamp is consistent
  TestValidator.equals(
    "deleted_at remains consistent across multiple deletions",
    secondDeletion.deleted_at,
    firstDeletedAt,
  );

  // Step 7: Verify community remains deleted after multiple deletion attempts
  TestValidator.equals(
    "community ID remains same",
    secondDeletion.id,
    community.id,
  );
  TestValidator.equals(
    "community identifier remains same",
    secondDeletion.identifier,
    community.identifier,
  );
  TestValidator.predicate(
    "community is still marked as deleted",
    secondDeletion.deleted_at !== null &&
      secondDeletion.deleted_at !== undefined,
  );
}
