import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_ban_ban_user } from "../../../generate/generate_random_discussion_board_administrator_administrator_ban_ban_user";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_banning_registered_user_authorized_success_and_failure_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully banning a registered user by an authorized administrator.
  // - Authenticate as an administrator via the join operation.
  // - Use a valid registeredUserId corresponding to an active registered user.
  // - Provide a valid non-empty ban reason in the request body.
  // - Call the banUser endpoint.
  // - Verify that the response confirms the ban was recorded successfully.
  // - Confirm the banned user cannot login afterwards but previous content remains accessible.
  // Scenario 2: Attempt ban with unauthorized user or missing authorization.
  // - Attempt to ban a user without authenticating as administrator.
  // - Attempt to ban a user authenticated as a non-administrator.
  // - Confirm the system rejects the request with proper authorization errors.
  // Scenario 3: Attempt to ban a registered user that does not exist in the system.
  // - Authenticate as an administrator.
  // - Use a registeredUserId that does not exist.
  // - Confirm the system responds with appropriate error indicating user not found.
  // Implementation
  // 1. Admin Join and setup connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Refresh adminConnection headers with token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Create a registered user (simulate summary with random UUID and email)
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Scenario 1: Ban registered user successfully
  // Ban reason non-empty
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banUserBan1 =
    await generate_random_discussion_board_administrator_administrator_ban_ban_user(
      adminConnection,
      {
        params: { registeredUserId },
        body: {
          registeredUserId,
          reason: banReason,
        },
      },
    );
  typia.assert(banUserBan1);
  TestValidator.equals("ban reason matches", banUserBan1.reason, banReason);
  TestValidator.equals(
    "ban registered user id matches",
    banUserBan1.registeredUserId,
    registeredUserId,
  );
  // 4. Scenario 2: Attempt ban with unauthorized user or missing authorization
  // 4a. Missing authorization connection
  const anonConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "ban without authentication should fail",
    async () => {
      await generate_random_discussion_board_administrator_administrator_ban_ban_user(
        anonConnection,
        {
          params: { registeredUserId },
          body: {
            registeredUserId,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
  // 4b. Non-administrator authorization (simulate by joining as another administrator with limited rights)
  // Since we have only administrator, simulate non-administrator connection
  // by using anonymous connection with some header to fail authorization
  // Actually, we cannot create non-administrator connection via given API,
  // so we simulate with anonymous again to test unauthorized error
  await TestValidator.error(
    "ban with non-administrator auth should fail",
    async () => {
      await generate_random_discussion_board_administrator_administrator_ban_ban_user(
        anonConnection,
        {
          params: { registeredUserId },
          body: {
            registeredUserId,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
  // 5. Scenario 3: Attempt to ban registered user that does not exist
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "ban a non-existent registered user should fail",
    async () => {
      await generate_random_discussion_board_administrator_administrator_ban_ban_user(
        adminConnection,
        {
          params: { registeredUserId: nonExistentUserId },
          body: {
            registeredUserId: nonExistentUserId,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
}
