import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_idempotent_fingerprint_reuse(
  connection: api.IConnection,
): Promise<void> {
  // Generate a fixed fingerprint for idempotent testing
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // Create the request body with valid URI formats
  const body = {
    fingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneGuest.IJoin;
  // First guest join - creates guest record and session
  const firstResponse = await api.functional.redditClone.auth.guest.join(
    connection,
    { body },
  );
  typia.assert(firstResponse);
  // Second guest join with identical fingerprint - should reuse guest record but create new session
  const secondResponse = await api.functional.redditClone.auth.guest.join(
    connection,
    { body },
  );
  typia.assert(secondResponse);
  // Verify guest_id is reused (proving idempotent behavior)
  TestValidator.equals(
    "guest_id should be reused across idempotent requests",
    firstResponse.id,
    secondResponse.id,
  );
  // Verify new tokens were issued (proving new session was created)
  TestValidator.notEquals(
    "access token should be different for new session",
    firstResponse.token.access,
    secondResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different for new session",
    firstResponse.token.refresh,
    secondResponse.token.refresh,
  );
  // Verify tokens have valid expiration timestamps
  TestValidator.predicate(
    "first response should have valid expired_at timestamp",
    () => {
      const expiredAt = new Date(firstResponse.token.expired_at);
      const now = new Date();
      return expiredAt > now;
    },
  );
  TestValidator.predicate(
    "first response should have valid refreshable_until timestamp",
    () => {
      const refreshableUntil = new Date(firstResponse.token.refreshable_until);
      const now = new Date();
      return refreshableUntil > now;
    },
  );
  TestValidator.predicate(
    "second response should have valid expired_at timestamp",
    () => {
      const expiredAt = new Date(secondResponse.token.expired_at);
      const now = new Date();
      return expiredAt > now;
    },
  );
  TestValidator.predicate(
    "second response should have valid refreshable_until timestamp",
    () => {
      const refreshableUntil = new Date(secondResponse.token.refreshable_until);
      const now = new Date();
      return refreshableUntil > now;
    },
  );
}
