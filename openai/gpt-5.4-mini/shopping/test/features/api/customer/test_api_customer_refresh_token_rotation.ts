import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer refresh token rotation across consecutive refresh calls.
   *
   * Verifies that a customer can continuously rotate refresh tokens during an authenticated session while preserving account identity and lifecycle fields.
   * The scenario checks that each refresh issues a new token pair, rotates the refresh token value, updates expiry metadata, and keeps customer business data unchanged.
   *
   * 1. Register a customer account and capture the initial authorization token pair.
   * 2. Refresh once using the issued refresh token and validate the returned authorization payload.
   * 3. Refresh again using the newly issued refresh token and validate the second authorization payload.
   * 4. Confirm identity, status, and lifecycle fields remain stable while token values rotate.
   */
  const signUpConnection: api.IConnection = { host: connection.host };
  const initial = await authorize_customer_join(signUpConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(initial);
  const firstToken = initial.token;
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedOnce = await authorize_customer_refresh(
    firstRefreshConnection,
    {
      body: {
        refreshToken: firstToken.refresh,
      } satisfies IMallPlatformCustomer.IRefresh,
    },
  );
  typia.assert(refreshedOnce);
  TestValidator.equals(
    "customer id preserved after first refresh",
    refreshedOnce.id,
    initial.id,
  );
  TestValidator.equals(
    "customer email preserved after first refresh",
    refreshedOnce.email,
    initial.email,
  );
  TestValidator.equals(
    "customer status preserved after first refresh",
    refreshedOnce.status,
    initial.status,
  );
  TestValidator.equals(
    "customer created_at preserved after first refresh",
    refreshedOnce.created_at,
    initial.created_at,
  );
  TestValidator.equals(
    "customer deleted_at preserved after first refresh",
    refreshedOnce.deleted_at,
    initial.deleted_at,
  );
  TestValidator.notEquals(
    "access token rotates after first refresh",
    refreshedOnce.token.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "refresh token rotates after first refresh",
    refreshedOnce.token.refresh,
    firstToken.refresh,
  );
  TestValidator.notEquals(
    "access expiry rotates after first refresh",
    refreshedOnce.token.expired_at,
    firstToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline rotates after first refresh",
    refreshedOnce.token.refreshable_until,
    firstToken.refreshable_until,
  );
  const secondToken = refreshedOnce.token;
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedTwice = await authorize_customer_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: secondToken.refresh,
      } satisfies IMallPlatformCustomer.IRefresh,
    },
  );
  typia.assert(refreshedTwice);
  TestValidator.equals(
    "customer id preserved after second refresh",
    refreshedTwice.id,
    initial.id,
  );
  TestValidator.equals(
    "customer email preserved after second refresh",
    refreshedTwice.email,
    initial.email,
  );
  TestValidator.equals(
    "customer status preserved after second refresh",
    refreshedTwice.status,
    initial.status,
  );
  TestValidator.equals(
    "customer created_at preserved after second refresh",
    refreshedTwice.created_at,
    initial.created_at,
  );
  TestValidator.equals(
    "customer deleted_at preserved after second refresh",
    refreshedTwice.deleted_at,
    initial.deleted_at,
  );
  TestValidator.notEquals(
    "access token rotates after second refresh",
    refreshedTwice.token.access,
    secondToken.access,
  );
  TestValidator.notEquals(
    "refresh token rotates after second refresh",
    refreshedTwice.token.refresh,
    secondToken.refresh,
  );
  TestValidator.notEquals(
    "access expiry rotates after second refresh",
    refreshedTwice.token.expired_at,
    secondToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline rotates after second refresh",
    refreshedTwice.token.refreshable_until,
    secondToken.refreshable_until,
  );
  TestValidator.notEquals(
    "second refresh access token differs from first session",
    refreshedTwice.token.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "second refresh refresh token differs from first session",
    refreshedTwice.token.refresh,
    firstToken.refresh,
  );
}
