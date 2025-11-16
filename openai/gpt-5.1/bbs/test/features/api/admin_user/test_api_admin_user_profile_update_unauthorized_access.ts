import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Verify that admin user profile update is rejected without proper admin
 * authentication.
 *
 * Business intent:
 *
 * - Ensure that the PUT /discussionBoard/adminUser/adminUsers/{adminUserId}
 *   endpoint enforces the `adminUser` authorization actor and cannot be invoked
 *   successfully by unauthenticated callers.
 * - Confirm that, when a valid admin session is present, other admin-only
 *   endpoints such as article category creation behave normally so we know the
 *   admin setup is correct.
 *
 * Scenario steps:
 *
 * 1. Call POST /auth/adminUser/join to create an admin account, which also
 *    establishes an authenticated `adminUser` session on the base connection.
 * 2. As that admin, call POST /discussionBoard/adminUser/articleCategories with a
 *    valid IDiscussionBoardArticleCategory.ICreate payload to verify that
 *    admin-only operations succeed under proper authentication.
 * 3. Create an unauthenticated connection by shallow-cloning the incoming
 *    connection but setting `headers` to an empty object, so no Authorization
 *    header is present.
 * 4. Using this unauthenticated connection, attempt to call PUT
 *    /discussionBoard/adminUser/adminUsers/{adminUserId} with a valid
 *    IDiscussionBoardAdminuser.IUpdate payload and expect the call to fail with
 *    an HttpError via TestValidator.httpError.
 * 5. Throughout, ensure that the base authenticated connection remains intact and
 *    is not mutated in a way that could affect other tests.
 */
export async function test_api_admin_user_profile_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Join as an admin user to obtain a valid admin session and id
  const joinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const authorizedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. As this admin, create an article category to verify admin-only access works
  const categoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Prepare an update payload for the admin profile
  const updateBody = typia.random<IDiscussionBoardAdminuser.IUpdate>();

  // 4. Build an unauthenticated connection by clearing headers on a clone
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to update admin profile without any Authorization header
  await TestValidator.httpError(
    "admin profile update without auth must fail",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.update(
        unauthConn,
        {
          adminUserId: authorizedAdmin.id,
          body: updateBody,
        },
      );
    },
  );
}
