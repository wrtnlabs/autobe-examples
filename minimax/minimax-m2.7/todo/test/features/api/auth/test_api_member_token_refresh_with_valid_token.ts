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

export async function test_api_member_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via join to obtain initial tokens
  const joinResponse = await api.functional.multiUserTodo.auth.member.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        displayName: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  typia.assert(joinResponse);
  const originalRefreshToken = joinResponse.token.refresh;
  const memberId = joinResponse.id;
  const memberEmail = joinResponse.email;
  const memberDisplayName = joinResponse.display_name;
  // 2. Call refresh endpoint with valid refresh token
  const refreshResponse =
    await api.functional.multiUserTodo.auth.member.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IMultiUserTodoMember.IRefresh,
    });
  typia.assert(refreshResponse);
  // 3. Validate new access token and refresh token are returned
  TestValidator.predicate(
    "new access token is returned",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is returned",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token differs from original",
    refreshResponse.token.access !== originalRefreshToken,
  );
  // 4. Validate expiration timestamps are present and valid
  TestValidator.predicate(
    "expired_at is ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.refreshable_until,
    ),
  );
  // 5. Validate member information matches original join response
  TestValidator.equals("member id matches", refreshResponse.id, memberId);
  TestValidator.equals(
    "member email matches",
    refreshResponse.email,
    memberEmail,
  );
  TestValidator.equals(
    "member display_name matches",
    refreshResponse.display_name,
    memberDisplayName,
  );
  // 6. Verify new access token can be used for authenticated requests
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers ??= {};
  profileConnection.headers.Authorization = `Bearer ${refreshResponse.token.access}`;
  // Note: If there was a profile endpoint, we would call it here
  // For now, we validate that the token structure is usable
  TestValidator.predicate(
    "access token is a valid JWT format",
    refreshResponse.token.access.split(".").length === 3,
  );
}
