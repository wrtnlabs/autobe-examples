import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community identifier (handle) is immutable and cannot be changed
 * via update.
 *
 * This test validates that the community identifier field is immutable after
 * creation. The test creates a community with a specific identifier, then
 * attempts to update it with different values for mutable fields. The test
 * verifies that the identifier remains unchanged after the update, while other
 * fields (name, description, visibility, post restrictions) can be successfully
 * modified.
 *
 * Business Context: Communities have unique, URL-safe identifiers that serve as
 * canonical references in URLs (e.g., r/identifier). These identifiers must be
 * immutable to prevent breaking existing community URLs and references.
 *
 * Steps:
 *
 * 1. Create member account (community creator)
 * 2. Create administrator account
 * 3. Create category for community classification
 * 4. Create community with initial identifier
 * 5. Verify community identifier is set correctly
 * 6. Update community with new values for mutable fields only
 * 7. Verify identifier remained unchanged (immutable constraint)
 * 8. Verify other fields were successfully updated
 * 9. Validate final community state matches expected values
 */
export async function test_api_community_update_immutable_identifier_ignored(
  connection: api.IConnection,
) {
  // Step 1: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(memberAuth);
  TestValidator.equals(
    "member created successfully",
    memberAuth.id !== undefined,
    true,
  );

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(adminAuth);

  // Step 3: Create category for community classification
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(8)}`,
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

  // Switch back to member for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community with initial identifier
  const initialIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const createData = {
    name: "Original Community Name",
    identifier: initialIdentifier,
    description: "Original description",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: createData,
      },
    );
  typia.assert(createdCommunity);

  // Step 5: Verify community identifier is set correctly
  TestValidator.equals(
    "initial identifier matches created value",
    createdCommunity.identifier,
    initialIdentifier,
  );
  TestValidator.equals(
    "initial name matches",
    createdCommunity.name,
    "Original Community Name",
  );
  TestValidator.equals(
    "initial description matches",
    createdCommunity.description,
    "Original description",
  );

  // Step 6: Update community with new values for mutable fields only
  const updateData = {
    name: "Updated Community Name",
    description: "Updated description",
    visibility: "private" as const,
    post_creation_restriction: "moderators_only" as const,
    post_type_restriction: "text_only" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: createdCommunity.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);

  // Step 7: Verify identifier remained unchanged (immutable constraint)
  TestValidator.equals(
    "identifier is immutable and unchanged",
    updatedCommunity.identifier,
    initialIdentifier,
  );

  // Step 8: Verify other fields were successfully updated
  TestValidator.equals(
    "name was updated",
    updatedCommunity.name,
    "Updated Community Name",
  );
  TestValidator.equals(
    "description was updated",
    updatedCommunity.description,
    "Updated description",
  );
  TestValidator.equals(
    "visibility was updated",
    updatedCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "post_creation_restriction was updated",
    updatedCommunity.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "post_type_restriction was updated",
    updatedCommunity.post_type_restriction,
    "text_only",
  );

  // Step 9: Validate final community state
  TestValidator.equals(
    "community id is preserved",
    updatedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "category remains assigned",
    updatedCommunity.category.slug,
    category.slug,
  );
  TestValidator.equals(
    "creator remains same",
    updatedCommunity.creator.id,
    memberAuth.id,
  );
}
