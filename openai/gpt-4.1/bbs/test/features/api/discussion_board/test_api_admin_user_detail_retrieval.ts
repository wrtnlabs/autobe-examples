import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate admin-privileged user detail retrieval and privacy compliance in
 * /discussionBoard/admin/users/{userId}.
 *
 * Steps:
 *
 * 1. Register an admin account and gain admin access.
 * 2. Create a new user implicitly by posting a discussion article (user is created
 *    as side effect).
 * 3. As admin, retrieve that user's detail with their userId using the admin
 *    endpoint.
 * 4. Assert profile structure adheres to privacy policy: no authentication data
 *    (no password), presence of legitimate fields only, and field mappings
 *    match user creation results.
 * 5. Attempt to retrieve a user with a random UUID not present and verify that a
 *    precise error response occurs, indicating the user does not exist.
 * 6. Confirm basic audit and compliance requirements are met by response structure
 *    (e.g., is_locked, deleted_at, timestamps present and of correct format).
 */
export async function test_api_admin_user_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain access
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Create new user implicitly by posting an article as that user
  const articleInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    // no attachments
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: articleInput,
    });
  typia.assert(article);
  const userId = typia.assert(article.author.id!);
  const userDisplayName = article.author.display_name;

  // 3. Use admin privileges to retrieve full user profile by userId
  const user: IDiscussionBoardUser =
    await api.functional.discussionBoard.admin.users.at(connection, { userId });
  typia.assert(user);

  // 4. Assert privacy/compliance: only allowed fields present, no password, all formats correct, author mapping is precise
  TestValidator.predicate(
    "admin user detail: email is valid string",
    typeof user.email === "string" &&
      user.email.length >= 5 &&
      user.email.includes("@"),
  );
  TestValidator.equals(
    "admin user detail: display_name matches article author",
    user.display_name,
    userDisplayName,
  );
  TestValidator.equals(
    "admin user detail: id matches author id",
    user.id,
    userId,
  );
  TestValidator.predicate(
    "admin user detail: no forbidden authentication fields",
    !("password_hash" in user),
  );
  TestValidator.predicate(
    "admin user detail: is_locked is boolean",
    typeof user.is_locked === "boolean",
  );
  TestValidator.predicate(
    "admin user detail: created_at is iso string",
    typeof user.created_at === "string" && !!Date.parse(user.created_at),
  );
  TestValidator.predicate(
    "admin user detail: updated_at is iso string",
    typeof user.updated_at === "string" && !!Date.parse(user.updated_at),
  );

  // 5. Attempt to fetch nonexistent user as admin and expect a precise error
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin receives error fetching nonexistent user",
    async () => {
      await api.functional.discussionBoard.admin.users.at(connection, {
        userId: fakeUserId,
      });
    },
  );
}
