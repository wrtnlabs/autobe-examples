import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_create_by_moderator(
  connection: api.IConnection,
) {
  /**
   * Moderator-driven category creation E2E test (final)
   *
   * Flow:
   *
   * 1. Register a new moderator via POST /auth/moderator/join
   * 2. Create a discussion board category as the moderator
   * 3. Validate persisted fields and server timestamps
   * 4. Attempt duplicate creation -> expect error
   * 5. Attempt creation with unauthenticated connection -> expect error
   * 6. Ensure response does not leak sensitive information
   */

  // 1) Moderator join (SDK sets connection.headers.Authorization on success)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(4)}`;
  // Randomized, complex password to satisfy policy and avoid reuse
  const moderatorPassword = `Str0ng!${RandomGenerator.alphaNumeric(8)}`;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/current",
        referrer: "https://example.com/previous",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2) Create category as moderator
  const categoryBody = {
    name: "User Guides",
    slug: "user-guides",
    description: "Guides and how-tos for community members",
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3) Business validations (actual-first pattern)
  TestValidator.equals(
    "category name persisted",
    category.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "category slug persisted",
    category.slug,
    categoryBody.slug,
  );
  TestValidator.equals(
    "category is_active respected",
    category.is_active,
    categoryBody.is_active,
  );
  TestValidator.predicate(
    "created_at is set",
    category.created_at !== null && category.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    category.updated_at !== null && category.updated_at !== undefined,
  );

  // 4) Duplicate creation should fail (business-level conflict)
  await TestValidator.error(
    "duplicate category creation should fail",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: categoryBody,
        },
      );
    },
  );

  // 5) Unauthorized attempt: unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthCreateBody = {
    name: "User Guides - Unauthorized",
    slug: "user-guides-unauth",
    description: null,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  await TestValidator.error(
    "unauthenticated cannot create category",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        unauthConn,
        {
          body: unauthCreateBody,
        },
      );
    },
  );

  // 6) Audit / sensitive information check: ensure response does not contain sensitive keywords
  TestValidator.predicate(
    "create response does not leak sensitive keywords",
    !JSON.stringify(category).toLowerCase().includes("password"),
  );
}
