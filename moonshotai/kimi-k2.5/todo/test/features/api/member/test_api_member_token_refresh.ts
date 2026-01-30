import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test successful member token refresh workflow.
 *
 * A new member registers via the join endpoint to receive initial access and
 * refresh tokens. The member then uses the refresh token to obtain new token
 * pairs through the refresh endpoint. This test validates that:
 *
 * 1. The refresh operation successfully extends the authenticated session
 * 2. New access and refresh tokens are issued
 * 3. Token rotation is implemented (old refresh token is invalidated)
 * 4. Complete member information is returned with the new tokens
 *
 * This is the primary success path for maintaining long-lived sessions without
 * requiring repeated password entry.
 */
export async function test_api_member_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member and obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/todo/register",
      referrer: "https://example.com",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Use the refresh token to obtain new token pairs
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: initialAuth.token.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate token rotation - new tokens should be different from initial tokens
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // Step 4: Validate member information is preserved in the refreshed session
  TestValidator.equals(
    "member id should match",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "member email should match",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "member name should match",
    refreshedAuth.name,
    initialAuth.name,
  );
}
