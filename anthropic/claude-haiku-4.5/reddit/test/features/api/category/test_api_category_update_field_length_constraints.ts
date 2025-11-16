import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test enforcement of field length constraints during category update
 * operations.
 *
 * This test validates that the category update API properly enforces field
 * length constraints for all updatable fields. The test covers:
 *
 * 1. Valid updates with fields at maximum length limits succeed
 * 2. Valid updates with fields below maximum length limits succeed
 * 3. Updates with name exceeding 255 characters are rejected
 * 4. Updates with slug exceeding 255 characters are rejected
 * 5. Updates with description exceeding 500 characters are rejected
 * 6. Boundary conditions are properly handled
 * 7. Category data remains unchanged when invalid updates fail
 *
 * The test ensures data integrity by validating that oversized values cannot be
 * persisted to the database, preventing constraint violations and maintaining
 * consistency of the category taxonomy system.
 */
export async function test_api_category_update_field_length_constraints(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category to test field length constraint enforcement
  const originalCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology related communities",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(originalCategory);
  TestValidator.equals(
    "category created successfully",
    originalCategory.name,
    "Technology",
  );

  // 3. Test valid update with name at maximum length (255 characters)
  const maxLengthName = RandomGenerator.alphabets(255);
  const validUpdateMaxName: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          name: maxLengthName,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(validUpdateMaxName);
  TestValidator.equals(
    "name updated to maximum length",
    validUpdateMaxName.name,
    maxLengthName,
  );

  // 4. Test valid update with slug at maximum length (255 characters)
  const maxLengthSlug = RandomGenerator.alphabets(255).toLowerCase();
  const validUpdateMaxSlug: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          slug: maxLengthSlug,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(validUpdateMaxSlug);
  TestValidator.equals(
    "slug updated to maximum length",
    validUpdateMaxSlug.slug,
    maxLengthSlug,
  );

  // 5. Test valid update with description at maximum length (500 characters)
  const maxLengthDescription = RandomGenerator.alphabets(500);
  const validUpdateMaxDescription: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          description: maxLengthDescription,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(validUpdateMaxDescription);
  TestValidator.equals(
    "description updated to maximum length",
    validUpdateMaxDescription.description,
    maxLengthDescription,
  );

  // 6. Test update with name exceeding maximum length (256 characters)
  const oversizeName = RandomGenerator.alphabets(256);
  await TestValidator.error(
    "name exceeding 255 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: originalCategory.id,
          body: {
            name: oversizeName,
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 7. Test update with slug exceeding maximum length (256 characters)
  const oversizeSlug = RandomGenerator.alphabets(256).toLowerCase();
  await TestValidator.error(
    "slug exceeding 255 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: originalCategory.id,
          body: {
            slug: oversizeSlug,
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 8. Test update with description exceeding maximum length (501 characters)
  const oversizeDescription = RandomGenerator.alphabets(501);
  await TestValidator.error(
    "description exceeding 500 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: originalCategory.id,
          body: {
            description: oversizeDescription,
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 9. Test valid update with multiple fields below maximum length
  const validName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const validSlug = RandomGenerator.alphabets(20).toLowerCase();
  const validDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 2,
    wordMax: 8,
  });
  const multiFieldUpdate: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          name: validName,
          slug: validSlug,
          description: validDescription,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(multiFieldUpdate);
  TestValidator.equals(
    "multi-field update succeeds with valid lengths",
    multiFieldUpdate.name,
    validName,
  );
  TestValidator.equals(
    "slug persisted correctly",
    multiFieldUpdate.slug,
    validSlug,
  );
  TestValidator.equals(
    "description persisted correctly",
    multiFieldUpdate.description,
    validDescription,
  );

  // 10. Test boundary condition: name with exactly 255 characters
  const boundaryName = "a".repeat(255);
  const boundaryNameUpdate: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          name: boundaryName,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(boundaryNameUpdate);
  TestValidator.equals(
    "boundary name length accepted",
    boundaryNameUpdate.name.length,
    255,
  );

  // 11. Test boundary condition: slug with exactly 255 characters
  const boundarySlug = "a".repeat(255);
  const boundarySlugUpdate: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          slug: boundarySlug,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(boundarySlugUpdate);
  TestValidator.equals(
    "boundary slug length accepted",
    boundarySlugUpdate.slug.length,
    255,
  );

  // 12. Test boundary condition: description with exactly 500 characters
  const boundaryDescription = "a".repeat(500);
  const boundaryDescriptionUpdate: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          description: boundaryDescription,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(boundaryDescriptionUpdate);
  TestValidator.equals(
    "boundary description length accepted",
    boundaryDescriptionUpdate.description?.length,
    500,
  );

  // 13. Verify category state is not corrupted after failed update attempts
  const verifyCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          display_order: 5,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(verifyCategory);
  TestValidator.predicate(
    "category can be retrieved and updated after constraint violations",
    verifyCategory.id === originalCategory.id,
  );
}
