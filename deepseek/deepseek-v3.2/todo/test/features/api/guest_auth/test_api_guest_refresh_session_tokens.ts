import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_session_tokens(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Successful guest session refresh with token rotation
  {
    // Create guest account using utility function
    const guestConnection1: api.IConnection = { host: connection.host };
    const joinResult = await authorize_guest_join(guestConnection1, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(joinResult);
    // Store original tokens
    const originalAccessToken = joinResult.token.access;
    const originalRefreshToken = joinResult.token.refresh;
    // Create new connection for refresh operation
    const refreshConnection1: api.IConnection = { host: connection.host };
    // Call refresh using utility function
    const refreshResult = await authorize_guest_refresh(refreshConnection1, {
      body: {
        refresh_token: originalRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(refreshResult);
    // Validate new tokens are different from original
    TestValidator.notEquals(
      "access token should be refreshed",
      refreshResult.token.access,
      originalAccessToken,
    );
    TestValidator.notEquals(
      "refresh token should be rotated",
      refreshResult.token.refresh,
      originalRefreshToken,
    );
    // Validate token expiration timestamps are updated
    TestValidator.predicate(
      "expired_at should be a future timestamp",
      new Date(refreshResult.token.expired_at) > new Date(),
    );
    TestValidator.predicate(
      "refreshable_until should be a future timestamp",
      new Date(refreshResult.token.refreshable_until) > new Date(),
    );
    // Validate guest account information persists
    TestValidator.equals(
      "guest ID should remain the same",
      refreshResult.id,
      joinResult.id,
    );
    TestValidator.equals(
      "device fingerprint should remain the same",
      refreshResult.device_fingerprint,
      joinResult.device_fingerprint,
    );
  }
  // Test 2: Refresh token rotation - old token cannot be reused
  {
    // Create guest account with unique fingerprint
    const guestConnection2: api.IConnection = { host: connection.host };
    const joinResult2 = await authorize_guest_join(guestConnection2, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(joinResult2);
    const originalRefreshToken = joinResult2.token.refresh;
    // First refresh should succeed
    const refreshConnection2: api.IConnection = { host: connection.host };
    const firstRefresh = await authorize_guest_refresh(refreshConnection2, {
      body: {
        refresh_token: originalRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(firstRefresh);
    // Second attempt with same refresh token should fail
    const secondRefreshConnection: api.IConnection = { host: connection.host };
    await TestValidator.error(
      "original refresh token should be invalid after rotation",
      async () => {
        await authorize_guest_refresh(secondRefreshConnection, {
          body: {
            refresh_token: originalRefreshToken,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          },
        });
      },
    );
    // New refresh token should work
    const newRefreshConnection: api.IConnection = { host: connection.host };
    const secondRefresh = await authorize_guest_refresh(newRefreshConnection, {
      body: {
        refresh_token: firstRefresh.token.refresh,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(secondRefresh);
    // Validate token chain
    TestValidator.notEquals(
      "second refresh token should differ from first",
      secondRefresh.token.refresh,
      firstRefresh.token.refresh,
    );
  }
  // Test 3: Alternative validation - refresh with malformed refresh token
  {
    const invalidConnection: api.IConnection = { host: connection.host };
    await TestValidator.error(
      "refresh with malformed token should fail",
      async () => {
        await authorize_guest_refresh(invalidConnection, {
          body: {
            refresh_token: "malformed-jwt-token.without.proper.format",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          },
        });
      },
    );
  }
}
