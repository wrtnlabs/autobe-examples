import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member token refresh workflow.
 *
 * Validates the complete token refresh flow:
 * 1. Register new member account
 * 2. Extract refresh token from initial response
 * 3. Refresh tokens using the refresh endpoint
 * 4. Verify token rotation (new tokens are different)
 * 5. Verify old refresh token is invalidated
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registered);
  // Store initial tokens
  const initialAccessToken = registered.token.access;
  const initialRefreshToken = registered.token.refresh;
  const initialExpiredAt = registered.token.expired_at;
  // 2. Refresh tokens using the refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    },
  });
  typia.assert(refreshed);
  // 3. Verify token rotation - new tokens are different from old ones
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    initialRefreshToken,
  );
  // 4. Verify new tokens are valid
  TestValidator.predicate(
    "new access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new expired_at is valid date-time",
    !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  // 5. Verify old refresh token is invalidated
  const oldTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old refresh token is invalidated",
    401,
    async () =>
      await authorize_member_refresh(oldTokenConnection, {
        body: {
          refresh_token: initialRefreshToken,
        },
      }),
  );
  // 6. Verify member data is preserved
  TestValidator.equals("member id preserved", refreshed.id, registered.id);
  TestValidator.equals(
    "member email preserved",
    refreshed.email,
    registered.email,
  );
  TestValidator.equals(
    "member display_name preserved",
    refreshed.display_name,
    registered.display_name,
  );
}
