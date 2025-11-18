import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_auth_guest_join_creation(
  connection: api.IConnection,
) {
  // Step 1: Prepare join request body following ITodoListGuest.IJoin structure
  const joinBody = {
    href: "https://example.com/current-page",
    referrer: "https://google.com/",
    ip: null,
  } satisfies ITodoListGuest.IJoin;

  // Step 2: Call the join API for guest creation
  const guestAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: joinBody });

  // Step 3: Assert the entire response type correctness
  typia.assert(guestAuth);

  // Step 4: Validate guest id format is UUID
  TestValidator.predicate(
    "guest id UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      guestAuth.id,
    ),
  );

  // Step 5: Validate presence of token object
  TestValidator.predicate(
    "token is present",
    guestAuth.token !== null && guestAuth.token !== undefined,
  );

  // Step 6: Validate access token is non-empty string
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof guestAuth.token.access === "string" &&
      guestAuth.token.access.length > 0,
  );

  // Step 7: Validate refresh token is non-empty string
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof guestAuth.token.refresh === "string" &&
      guestAuth.token.refresh.length > 0,
  );

  // Step 8: Validate expired_at is ISO 8601 date-time format string
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      guestAuth.token.expired_at,
    ),
  );

  // Step 9: Validate refreshable_until is ISO 8601 date-time format string
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      guestAuth.token.refreshable_until,
    ),
  );
}
