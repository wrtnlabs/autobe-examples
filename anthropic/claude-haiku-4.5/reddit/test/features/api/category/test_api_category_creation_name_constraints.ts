import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category name field validation with length constraints.
 *
 * This test validates the name field constraints for category creation:
 *
 * - Name is required and must be between 1-255 characters
 * - Valid names of various lengths are successfully accepted
 * - Multiple categories can share the same name (name is not globally unique)
 *
 * The test performs the following workflow:
 *
 * 1. Create and authenticate as administrator
 * 2. Test valid category names of different lengths (1, 50, 100, 255 characters)
 * 3. Verify categories can be created with duplicate names
 * 4. Validate that all created categories have the correct name lengths
 */
export async function test_api_category_creation_name_constraints(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Test valid category names of various lengths
  // Test with 1 character name
  const category1Char: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(1),
          slug: `slug-${RandomGenerator.alphaNumeric(8)}`,
          description: null,
          icon_url: null,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category1Char);
  TestValidator.predicate(
    "1-character name is valid",
    category1Char.name.length === 1,
  );

  // Test with 50 character name
  const category50Char: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(50),
          slug: `slug-${RandomGenerator.alphaNumeric(8)}`,
          description: null,
          icon_url: null,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category50Char);
  TestValidator.predicate(
    "50-character name is valid",
    category50Char.name.length === 50,
  );

  // Test with 100 character name
  const category100Char: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(100),
          slug: `slug-${RandomGenerator.alphaNumeric(8)}`,
          description: null,
          icon_url: null,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category100Char);
  TestValidator.predicate(
    "100-character name is valid",
    category100Char.name.length === 100,
  );

  // Test with maximum 255 character name
  const category255Char: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(255),
          slug: `slug-${RandomGenerator.alphaNumeric(8)}`,
          description: null,
          icon_url: null,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category255Char);
  TestValidator.predicate(
    "255-character name is valid",
    category255Char.name.length === 255,
  );

  // 3. Verify names do not need to be globally unique (can create duplicates)
  const duplicateName = RandomGenerator.paragraph({ sentences: 3 });
  const duplicateCategory1: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: duplicateName,
          slug: `slug-${RandomGenerator.alphaNumeric(8)}`,
          description: null,
          icon_url: null,
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(duplicateCategory1);

  const duplicateCategory2: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: duplicateName,
          slug: `slug-${RandomGenerator.alphaNumeric(8)}`,
          description: null,
          icon_url: null,
          display_order: 5,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(duplicateCategory2);
  TestValidator.equals(
    "duplicate category names are allowed",
    duplicateCategory1.name,
    duplicateCategory2.name,
  );
}
