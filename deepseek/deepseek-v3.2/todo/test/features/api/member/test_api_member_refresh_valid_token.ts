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

export async function test_api_member_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create member account using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  // Validate initial tokens are not empty
  TestValidator.predicate(
    "initial access token not empty",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token not empty",
    initialAuth.token.refresh.length > 0,
  );
  // Create a fresh connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Call refresh endpoint with the refresh token from initial auth
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Validate refreshed tokens are not empty
  TestValidator.predicate(
    "refreshed access token not empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token not empty",
    refreshedAuth.token.refresh.length > 0,
  );
  // Validate that new tokens are different from original tokens
  TestValidator.notEquals(
    "access tokens should differ",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens should differ",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // Verify that member information remains consistent
  TestValidator.equals(
    "member id should match",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "member email should match",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "member display_name should match",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
  // Validate that expiration timestamps are updated (should be different)
  TestValidator.notEquals(
    "expired_at should differ",
    initialAuth.token.expired_at,
    refreshedAuth.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until should differ",
    initialAuth.token.refreshable_until,
    refreshedAuth.token.refreshable_until,
  );
  // Verify timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "initial expired_at valid",
    () => !isNaN(Date.parse(initialAuth.token.expired_at)),
  );
  TestValidator.predicate(
    "initial refreshable_until valid",
    () => !isNaN(Date.parse(initialAuth.token.refreshable_until)),
  );
  TestValidator.predicate(
    "refreshed expired_at valid",
    () => !isNaN(Date.parse(refreshedAuth.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshed refreshable_until valid",
    () => !isNaN(Date.parse(refreshedAuth.token.refreshable_until)),
  );
}
