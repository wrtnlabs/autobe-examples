import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_account_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1. Register a new admin account
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const password = "P@ssw0rd123";
  const joinBody = {
    email: email,
    password: password,
    displayName: displayName,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const joined: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joined);

  // Step 2. Login with the registered admin
  const loginBody = {
    email: email,
    password: password,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const loggedIn: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // Step 3. Attempt to delete the newly created admin account
  // Ensure authorization headers are included automatically by SDK
  await api.functional.discussionBoard.admin.discussionBoardAdmins.erase(
    connection,
    { discussionBoardAdminId: joined.id },
  );

  // There is no response, so no typia.assert needed
  // Test that the deletion attempt with wrong/no auth should error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardAdmins.erase(
        unauthenticatedConnection,
        { discussionBoardAdminId: joined.id },
      );
    },
  );
}
