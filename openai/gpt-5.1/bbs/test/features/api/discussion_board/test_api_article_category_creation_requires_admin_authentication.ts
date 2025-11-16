import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Ensure that creating a discussion-board article category is allowed only for
 * authenticated adminUser actors.
 *
 * Business intent:
 *
 * - The article category master (discussion_board_article_categories) is
 *   privileged configuration and must not be modifiable by unauthenticated or
 *   non-admin actors.
 * - The POST /discussionBoard/adminUser/articleCategories endpoint is restricted
 *   to the adminUser authorization actor and should fail when called without a
 *   valid admin session.
 *
 * Test flow:
 *
 * 1. Build a valid category creation payload
 *    (IDiscussionBoardArticleCategory.ICreate) with a machine-friendly code,
 *    human-readable name, optional description, and an int32 order value.
 * 2. Derive an unauthenticated connection from the provided connection by
 *    shallow-cloning it and setting headers to an empty object literal (without
 *    further mutations), to simulate a request that has no Authorization
 *    header.
 * 3. Attempt to call
 *    api.functional.discussionBoard.adminUser.articleCategories.create using
 *    the unauthenticated connection and the prepared payload.
 *
 *    - Wrap this call in await TestValidator.error("unauthenticated category
 *         creation should fail", async () => { ... })
 *    - Do not assert any specific HttpError status code; we only assert that an
 *         error occurs.
 * 4. Using the original connection, register a new adminUser by calling
 *    api.functional.auth.adminUser.join with a randomly generated
 *    IDiscussionBoardAdminUserJoin.IRequest body (email, password,
 *    display_name, optional bio, href, referrer, etc.).
 *
 *    - After this call, the SDK automatically applies Authorization header on the
 *         connection for the adminUser.
 *    - Assert the response shape with typia.assert to ensure it conforms to
 *         IDiscussionBoardAdminuser.IAuthorized.
 * 5. Reuse the same category creation payload from step 1 and call
 *    api.functional.discussionBoard.adminUser.articleCategories.create again,
 *    now using the authenticated connection.
 *
 *    - Expect success; capture the response as IDiscussionBoardArticleCategory.
 *    - Validate the response with typia.assert.
 *    - Use TestValidator.equals to confirm that key business fields (code, name,
 *         description, order) in the response match the input payload values.
 *    - Additionally, confirm that deleted_at is null or undefined to reflect an
 *         active (non-deleted) category.
 */
export async function test_api_article_category_creation_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Build a deterministic category creation payload
  const categoryBody = {
    code: RandomGenerator.alphabets(8).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  // 2. Derive an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt category creation without authentication and expect failure
  await TestValidator.error(
    "unauthenticated category creation should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articleCategories.create(
        unauthenticated,
        {
          body: categoryBody,
        },
      );
    },
  );

  // 4. Join/register an adminUser to obtain authenticated context
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 5. Retry category creation with authenticated adminUser connection
  const created: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(created);

  // 6. Business field validations
  TestValidator.equals(
    "created category code matches request",
    created.code,
    categoryBody.code,
  );
  TestValidator.equals(
    "created category name matches request",
    created.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "created category description matches request",
    created.description ?? null,
    categoryBody.description ?? null,
  );
  TestValidator.equals(
    "created category order matches request",
    created.order,
    categoryBody.order,
  );

  TestValidator.predicate(
    "created category deleted_at is null or undefined",
    created.deleted_at === null || created.deleted_at === undefined,
  );
}
