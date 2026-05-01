import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful refresh token rotation for an authenticated member session.
 *
 * Validates that after member registration via join, presenting a valid refresh
 * token to the refresh endpoint returns a new token pair with different values,
 * confirming token rotation has occurred and the session has been extended.
 *
 * The test verifies that the refresh operation preserves the full authorization
 * response structure and that both the access and refresh tokens differ from
 * those originally issued during registration, ensuring the rotation mechanism
 * is functioning correctly for security.
 *
 * 1. Member registers via join and receives initial access/refresh tokens.
 * 2. Member calls refresh with the initial refresh token.
 * 3. Validates the new access token differs from the original.
 * 4. Validates the new refresh token differs from the original.
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {});
  typia.assert(joinResponse);
  // 2. Exchange the refresh token for a new token pair
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: joinResponse.token.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Validate token rotation — new tokens must differ from originals
  TestValidator.notEquals(
    "access token rotated",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
}
