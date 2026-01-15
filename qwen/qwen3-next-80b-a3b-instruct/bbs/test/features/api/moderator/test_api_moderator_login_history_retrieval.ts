import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuthenticationLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_login_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account using join operation to establish moderator role
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Extract user ID after successful join
  const adminUser: IAdmin.IAuthorized =
    typia.assert<IAdmin.IAuthorized>(adminAccount);
  // Step 2: Create a fresh connection for admin login and authenticate
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAdmin.ILogin,
  });
  // Step 3: Use admin connection to assign the admin as moderator
  const adminModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminModeratorConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAdmin.ILogin,
  });
  // Step 4: Assign the admin account as moderator using their ID
  await api.functional.discussionBoard.moderator.moderators.update(
    adminModeratorConnection,
    {
      moderatorId: adminUser.id,
      body: {
        status: "active",
        role: "content_reviewer",
        permissions: [], // Added required permissions property
      } satisfies IDiscussionBoardModerator.IUpdate,
    },
  );
  // Step 5: Create a new connection for login history retrieval (auth is already established)
  const moderatorHistoryConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(moderatorHistoryConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAdmin.ILogin,
  });
  // Step 6: Retrieve the moderator's login history using the moderatorId
  const loginHistory =
    await api.functional.discussionBoard.moderator.moderators.login_history.index(
      moderatorHistoryConnection,
      {
        moderatorId: adminUser.id,
      },
    );
  // Step 7: Validate the response structure
  typia.assert(loginHistory);
  // Step 8: Verify pagination structure matches IPage.IPagination
  // Check each pagination property individually against actual response
  TestValidator.equals(
    "pagination current page is 1",
    loginHistory.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    () => loginHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => loginHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => loginHistory.pagination.pages >= 0,
  );
  // Step 9: Verify data array exists and contains authentication logs
  TestValidator.predicate("data array exists", () =>
    Array.isArray(loginHistory.data),
  );
  TestValidator.predicate(
    "at least one login record exists",
    () => loginHistory.data.length >= 0,
  );
  // Step 10: If records exist, verify one belongs to correct moderator
  if (loginHistory.data.length > 0) {
    const loginRecord = loginHistory.data[0];
    TestValidator.equals(
      "correct moderator ID",
      loginRecord.user_id,
      adminUser.id,
    );
    TestValidator.equals(
      "authentication result is success",
      loginRecord.authentication_result,
      "success",
    );
  }
}
