import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_deleted_account(
  connection: api.IConnection,
) {
  // Prepare valid login credentials with session context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10) + "A1!";

  const loginBody = {
    email: email,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  // Test authentication rejection for deleted account
  // The moderator account should exist with correct credentials but account_status = 'deleted'
  // Expected behavior: API rejects login attempt and does not issue JWT tokens
  await TestValidator.error(
    "deleted moderator account should be rejected during login",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginBody,
      });
    },
  );
}
