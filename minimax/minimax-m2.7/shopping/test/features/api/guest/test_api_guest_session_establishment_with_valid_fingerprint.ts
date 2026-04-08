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

export async function test_api_guest_session_establishment_with_valid_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Use the utility function to establish guest session
  // This is REQUIRED - we must use authorize_guest_join, not api.functional.ecommerceMall.auth.guest.join
  const guestSession = await authorize_guest_join(connection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Validate the response with typia.assert
  typia.assert(guestSession);
  // Validate guest UUID is valid format
  TestValidator.predicate(
    "guest id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestSession.id,
    ),
  );
  // Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty string",
    typeof guestSession.token.access === "string" &&
      guestSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof guestSession.token.refresh === "string" &&
      guestSession.token.refresh.length > 0,
  );
  // Validate timestamps are in ISO 8601 format
  const expiredAtDate = new Date(guestSession.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date-time",
    !isNaN(expiredAtDate.getTime()) && expiredAtDate > new Date(),
  );
  const refreshableUntilDate = new Date(guestSession.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date-time",
    !isNaN(refreshableUntilDate.getTime()) &&
      refreshableUntilDate > expiredAtDate,
  );
  // Verify access token has short lifetime (~15 minutes)
  const accessTokenLifetimeMs = expiredAtDate.getTime() - Date.now();
  const accessTokenLifetimeMinutes = accessTokenLifetimeMs / (1000 * 60);
  TestValidator.predicate(
    "access token has short lifetime (~15 minutes)",
    accessTokenLifetimeMinutes >= 10 && accessTokenLifetimeMinutes <= 20,
  );
  // Verify refresh token has longer lifetime (~7 days)
  const refreshTokenLifetimeMs = refreshableUntilDate.getTime() - Date.now();
  const refreshTokenLifetimeDays =
    refreshTokenLifetimeMs / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token has longer lifetime (~7 days)",
    refreshTokenLifetimeDays >= 6 && refreshTokenLifetimeDays <= 8,
  );
}
