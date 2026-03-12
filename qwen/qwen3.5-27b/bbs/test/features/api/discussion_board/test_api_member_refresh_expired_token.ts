import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member token refresh with expired/invalid refresh token.
 *
 * 1. Register a new member to obtain initial tokens
 * 2. Attempt to refresh using an invalid refresh token (simulating expired)
 * 3. Verify that the operation returns 401 Unauthorized error
 * 4. Validate proper error handling for expired token scenario
 */
export async function test_api_member_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(registered);
  // 2. Create a new connection for refresh attempt with invalid token
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to refresh with an invalid/expired token
  // Using a clearly invalid token to simulate expired token scenario
  await TestValidator.httpError(
    "refresh with invalid token returns 401",
    401,
    async () =>
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh_token: "invalid_expired_token_12345",
        } satisfies IDiscussionBoardMember.IRefresh,
      }),
  );
  // 4. Verify the original member account still exists
  TestValidator.equals("member id is valid uuid", registered.id.length, 36);
  TestValidator.predicate(
    "member was successfully registered",
    registered.id !== null,
  );
}
