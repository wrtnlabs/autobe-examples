import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_multiple_sessions_same_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest join with fingerprint 'test-fingerprint-123'
  const firstResponse = await api.functional.ecommerceMall.auth.guest.join(
    connection,
    {
      body: {
        fingerprint: "test-fingerprint-123",
        href: "https://example.com",
        referrer: "https://google.com",
      } satisfies IEcommerceMallGuest.IJoin,
    },
  );
  typia.assert(firstResponse);
  // Record first session data
  const firstSessionId = firstResponse.id;
  const firstAccessToken = firstResponse.token.access;
  const firstRefreshToken = firstResponse.token.refresh;
  // 2. Second guest join with the same fingerprint but different navigation context
  const secondResponse = await api.functional.ecommerceMall.auth.guest.join(
    connection,
    {
      body: {
        fingerprint: "test-fingerprint-123",
        href: "https://example.com/products",
        referrer: "https://bing.com",
      } satisfies IEcommerceMallGuest.IJoin,
    },
  );
  typia.assert(secondResponse);
  // 3. Verify second response returns a different session id (UUID) than the first
  TestValidator.notEquals(
    "second session id should differ from first",
    firstSessionId,
    secondResponse.id,
  );
  // 4. Verify second response includes new JWT tokens (different access and refresh tokens)
  TestValidator.notEquals(
    "access token should be different",
    firstAccessToken,
    secondResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    firstRefreshToken,
    secondResponse.token.refresh,
  );
  // 5. Verify both tokens have appropriate expiration timestamps
  TestValidator.predicate(
    "first token should have valid expiration timestamp",
    () => {
      const date = new Date(firstResponse.token.expired_at);
      return !isNaN(date.getTime()) && date > new Date();
    },
  );
  TestValidator.predicate(
    "second token should have valid expiration timestamp",
    () => {
      const date = new Date(secondResponse.token.expired_at);
      return !isNaN(date.getTime()) && date > new Date();
    },
  );
  TestValidator.predicate(
    "first token should have valid refreshable_until timestamp",
    () => {
      const date = new Date(firstResponse.token.refreshable_until);
      return !isNaN(date.getTime()) && date > new Date();
    },
  );
  TestValidator.predicate(
    "second token should have valid refreshable_until timestamp",
    () => {
      const date = new Date(secondResponse.token.refreshable_until);
      return !isNaN(date.getTime()) && date > new Date();
    },
  );
  // 6. Verify expiration is after refreshable_until (access token expires before session)
  TestValidator.predicate(
    "access token should expire before refresh token",
    () => {
      const expFirst = new Date(firstResponse.token.expired_at);
      const expSecond = new Date(secondResponse.token.expired_at);
      const refreshFirst = new Date(firstResponse.token.refreshable_until);
      const refreshSecond = new Date(secondResponse.token.refreshable_until);
      return expFirst < refreshFirst && expSecond < refreshSecond;
    },
  );
}
