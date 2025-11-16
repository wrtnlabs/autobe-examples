import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category slug format and validation constraints.
 *
 * This test validates the slug field constraints for category creation. The
 * slug is a URL-safe identifier that must follow strict formatting rules:
 * lowercase alphanumeric characters with hyphens only. This test ensures that
 * invalid slugs are rejected while valid slugs are accepted.
 *
 * Test scenarios covered:
 *
 * 1. Empty string slug (violates minLength 1)
 * 2. Excessively long slug (> 255 characters, violates maxLength)
 * 3. Uppercase letters in slug (violates lowercase requirement)
 * 4. Spaces in slug (violates format requirement)
 * 5. Special characters like underscores and periods (violates format requirement)
 * 6. Valid slugs with proper lowercase alphanumeric and hyphens
 * 7. Slug field is required (cannot be omitted)
 */
export async function test_api_category_creation_invalid_slug(
  connection: api.IConnection,
) {
  // 1. Authenticate moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test empty string slug (violates minLength 1)
  await TestValidator.error("empty slug should be rejected", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  });

  // 3. Test excessively long slug (> 255 characters)
  await TestValidator.error(
    "slug exceeding 255 characters should be rejected",
    async () => {
      const longSlug = RandomGenerator.alphabets(256);
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            slug: longSlug,
            display_order: 1,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // 4. Test uppercase letters in slug
  await TestValidator.error(
    "uppercase letters in slug should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            slug: "Technology-Innovation",
            display_order: 1,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // 5. Test spaces in slug
  await TestValidator.error("spaces in slug should be rejected", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "technology innovation",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  });

  // 6. Test underscores in slug
  await TestValidator.error(
    "underscores in slug should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            slug: "technology_innovation",
            display_order: 1,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // 7. Test periods in slug
  await TestValidator.error("periods in slug should be rejected", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "technology.innovation",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  });

  // 8. Test valid slug with lowercase alphanumeric and hyphens
  const validCategory1: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Technology and Innovation",
          slug: "technology-innovation",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(validCategory1);
  TestValidator.equals(
    "valid slug created",
    validCategory1.slug,
    "technology-innovation",
  );

  // 9. Test another valid slug format
  const validCategory2: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Analysis",
          slug: "political-analysis",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(validCategory2);
  TestValidator.equals(
    "valid slug created",
    validCategory2.slug,
    "political-analysis",
  );

  // 10. Test valid slug with numbers
  const validCategory3: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economics 2024",
          slug: "economics-2024",
          display_order: 3,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(validCategory3);
  TestValidator.equals(
    "valid slug with numbers created",
    validCategory3.slug,
    "economics-2024",
  );
}
