import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Ensure that an authenticated adminUser receives an error when requesting an
 * administrator profile by a random, non-existent id.
 *
 * Business context:
 *
 * - Only authenticated adminUser actors may call the adminUsers.at endpoint.
 * - When an admin requests a profile by id, the backend must either return a
 *   valid IDiscussionBoardAdminuser profile or an error if no such admin exists
 *   for the given identifier.
 * - This test ensures that the system does not accidentally return some default
 *   or unrelated profile for unknown ids and correctly fails instead.
 *
 * Steps:
 *
 * 1. Join as a new adminUser via POST /auth/adminUser/join to establish an
 *    authenticated admin session (token wiring is handled by the SDK).
 * 2. Optionally create a single discussion-board article category via POST
 *    /discussionBoard/adminUser/articleCategories to mimic realistic admin
 *    usage before profile lookup.
 * 3. Generate a random UUID that is guaranteed to differ from the newly created
 *    administrator's id.
 * 4. Call GET /discussionBoard/adminUser/adminUsers/{adminUserId} with this
 *    unknown adminUserId while authenticated.
 * 5. Verify that the call fails by asserting that an error is thrown using
 *    TestValidator.error, without asserting any concrete HTTP status code.
 * 6. Ensure that the success path of IDiscussionBoardAdminuser is not taken for
 *    the unknown id case.
 */
export async function test_api_admin_user_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Join as a new adminUser to obtain an authenticated session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: "https://admin.discussion-board.local/join",
    referrer: "https://admin.discussion-board.local/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const authorizedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedAdmin);

  // 2. Optionally create one article category for contextual completeness.
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Generate a random UUID different from the real admin id.
  const realAdminId: string = authorizedAdmin.id;
  let unknownAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownAdminId === realAdminId) {
    unknownAdminId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4 & 5. Call adminUsers.at with the unknown id and verify an error occurs.
  await TestValidator.error(
    "requesting unknown adminUserId should result in an error",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.at(connection, {
        adminUserId: unknownAdminId,
      });
    },
  );
}
