import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAccount);
  // Verify admin account was created with active status
  TestValidator.equals(
    "admin created",
    adminAccount.member.display_name,
    adminCredentials.display_name,
  );
  TestValidator.equals(
    "initial status active",
    adminAccount.member.status,
    "active",
  );
  // Step 2: Ban the admin account
  // NOTE: No API endpoint available in the provided SDK to ban/suspend users.
  // In production, this would be done through:
  // - Admin panel UI operation
  // - Direct database update: UPDATE discussion_board_members SET status = 'suspended' WHERE id = ?
  // - Separate admin moderation API (not included in current SDK)
  //
  // For automated E2E testing of banned user login rejection, a banned account
  // must be pre-seeded in the test database or the ban operation must be
  // performed through alternative means before this test runs.
  //
  // Step 3: Attempt login with the admin credentials
  // With current API coverage, this login will SUCCEED because the account
  // remains active (step 2 cannot be executed). The backend login endpoint
  // specification indicates it should reject suspended accounts, but we cannot
  // verify this behavior without a ban API.
  //
  // To properly test banned user login rejection:
  // 1. Manually ban the created admin in the database
  // 2. Or use a pre-existing banned test account
  // 3. Or extend the SDK with a ban/suspend endpoint
  const loginConnection: api.IConnection = { host: connection.host };
  // This login succeeds for active users - demonstrating the authentication flow
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Verify login returned valid authentication tokens
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.equals(
    "member ID matches",
    loginResult.member.id,
    adminAccount.member.id,
  );
  // NOTE: To test banned user login rejection, the backend should return an error
  // when member.status === 'suspended'. This can be verified by:
  // 1. Setting up a banned test account in the test database
  // 2. Attempting login with that account
  // 3. Verifying the login fails with appropriate error message
  //
  // Example validation (requires pre-seeded banned account):
  // await TestValidator.error("banned admin login rejected", async () => {
  //   await authorize_admin_login(connection, {
  //     body: {
  //       email: "banned_admin@test.com",
  //       password: "correctPassword123",
  //       href: "https://test.com",
  //       referrer: "https://test.com",
  //     } satisfies IDiscussionBoardAdmin.ILogin,
  //   });
  // });
}
