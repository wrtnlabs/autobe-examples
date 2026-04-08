import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member refresh token renewal for the private todo application.
 *
 * Verifies that a freshly registered member can renew an active session using
 * the issued refresh token, and that the refreshed authorized payload keeps the
 * same account identity while preserving the private profile and owned todo
 * summaries.
 *
 * This scenario also checks token rotation metadata so the refreshed session
 * returns a new authorization bundle without changing the authenticated member
 * snapshot.
 *
 * 1. Register a new member and capture the issued authorization bundle.
 * 2. Renew the session with the member refresh token.
 * 3. Validate the refreshed member identity, profile, todo snapshot, and token metadata.
 */
export async function test_api_member_refresh_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const tokenBefore = joined.token;
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: tokenBefore.access },
  };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: tokenBefore.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "member id should stay the same after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should stay the same after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "profile should stay the same after refresh",
    refreshed.profile,
    joined.profile,
  );
  TestValidator.equals(
    "owned todo summaries should stay the same after refresh",
    refreshed.todos,
    joined.todos,
  );
  TestValidator.notEquals(
    "access token should be rotated",
    refreshed.token.access,
    tokenBefore.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshed.token.refresh,
    tokenBefore.refresh,
  );
  TestValidator.notEquals(
    "access expiration should be updated",
    refreshed.token.expired_at,
    tokenBefore.expired_at,
  );
  TestValidator.notEquals(
    "refreshability deadline should be updated",
    refreshed.token.refreshable_until,
    tokenBefore.refreshable_until,
  );
}
