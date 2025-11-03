import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate public retrieval of a discussion board category by slug.
 *
 * Business context:
 *
 * - Moderators can create categories used to organize discussion board articles.
 *   Categories are publicly retrievable by slug.
 * - This test creates a moderator, uses that moderator to create a category, and
 *   validates that unauthenticated (public) callers can successfully retrieve
 *   that category by slug. It also validates error behavior for an invalid slug
 *   format and a non-existent slug. The scenario to verify soft-delete
 *   visibility was omitted because the SDK does not provide a category
 *   delete/erase endpoint; instead we validate the non-existent slug behavior.
 *
 * Steps:
 *
 * 1. Moderator signs up via POST /auth/moderator/join
 * 2. Moderator creates a category via POST /discussionBoard/moderator/categories
 * 3. Public (unauthenticated) client GETs the category by slug and verifies the
 *    returned entity fields
 * 4. Validate invalid slug format produces an error
 * 5. Validate non-existent slug produces an error
 */
export async function test_api_category_get_by_slug_public(
  connection: api.IConnection,
) {
  // 1) Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.name(1)
    .toLowerCase()
    .replace(/\s+/g, "")
    .slice(0, 20);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.test/",
      referrer: "https://example.test/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2) Create a category as moderator
  const slugBase = RandomGenerator.alphabets(8).toLowerCase();
  const createBody = {
    name: RandomGenerator.name(2),
    slug: slugBase,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const created: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3) Public retrieval using unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const reloaded: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(unauthConn, {
      categorySlug: created.slug,
    });
  typia.assert(reloaded);

  // Validate returned fields match created resource
  TestValidator.equals(
    "category id matches created id",
    reloaded.id,
    created.id,
  );
  TestValidator.equals("category name matches", reloaded.name, created.name);
  TestValidator.equals("category slug matches", reloaded.slug, created.slug);
  TestValidator.equals(
    "category description matches",
    reloaded.description,
    created.description,
  );
  TestValidator.equals(
    "category is_active matches",
    reloaded.is_active,
    created.is_active,
  );
  TestValidator.predicate(
    "category has created_at",
    typeof reloaded.created_at === "string" && reloaded.created_at.length > 0,
  );
  TestValidator.predicate(
    "category has updated_at",
    typeof reloaded.updated_at === "string" && reloaded.updated_at.length > 0,
  );
  // deleted_at should be null or undefined for active category
  TestValidator.predicate(
    "category deleted_at is null or undefined",
    reloaded.deleted_at === null || reloaded.deleted_at === undefined,
  );

  // 4) Invalid slug format should cause an error (business validation)
  await TestValidator.error("invalid slug format should error", async () => {
    await api.functional.discussionBoard.categories.at(unauthConn, {
      categorySlug: "invalid slug with spaces!",
    });
  });

  // 5) Non-existent slug should cause an error (not found)
  const nonExistentSlug = `${slugBase}-nonexistent-${RandomGenerator.alphaNumeric(4)}`;
  await TestValidator.error("non-existent slug should error", async () => {
    await api.functional.discussionBoard.categories.at(unauthConn, {
      categorySlug: nonExistentSlug,
    });
  });
}
