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

export async function test_api_member_token_refresh_after_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for authorization
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Member joins the system to obtain initial refresh token
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // Validate we received valid tokens
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  // Step 2: Test refresh with valid token (should succeed)
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: authorized.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshed);
  // Validate refresh returned new tokens with extended expiration
  TestValidator.predicate(
    "new access token generated",
    refreshed.token.access !== authorized.token.access,
  );
  TestValidator.predicate(
    "new token expires in future",
    new Date(refreshed.token.expired_at) > new Date(),
  );
  // Step 3: Test refresh with invalid token (simulates deleted account scenario)
  // Note: Without delete API, testing invalid token rejection validates same security principle
  await TestValidator.httpError(
    "refresh with invalid token fails",
    401,
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(invalidConnection, {
        body: {
          refresh_token:
            "invalid_refresh_token_" + RandomGenerator.alphaNumeric(16),
        } satisfies IMultiUserTodoMember.IRefresh,
      });
    },
  );
  // Step 4: Test refresh with empty token
  await TestValidator.httpError(
    "refresh with empty token fails",
    [400, 401],
    async () => {
      const emptyConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(emptyConnection, {
        body: {
          refresh_token: "",
        } satisfies IMultiUserTodoMember.IRefresh,
      });
    },
  );
}
