import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
) {
  // 1) Create a guest via POST /auth/guest/join and capture initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies ITodoAppGuest.IJoin;
  const created: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: joinBody });
  // Runtime type validation
  typia.assert(created);

  // Basic assertions about join response
  TestValidator.predicate(
    "join: issued refresh token exists",
    typeof created.token?.refresh === "string" &&
      created.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join: issued access token exists",
    typeof created.token?.access === "string" &&
      created.token.access.length > 0,
  );

  // 2) Exchange the captured refresh token for renewed tokens
  const refreshRequest = {
    refresh_token: created.token.refresh,
  } satisfies ITodoAppGuest.IRefresh;
  const refreshed: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshed);

  // Validate business expectations after refresh
  TestValidator.equals(
    "refresh: guest id remains the same",
    refreshed.id,
    created.id,
  );
  TestValidator.predicate(
    "refresh: returned access token is present",
    typeof refreshed.token?.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh: returned refresh token is present",
    typeof refreshed.token?.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // If last_active_at is present, assert it is >= created_at
  if (
    refreshed.last_active_at === null ||
    refreshed.last_active_at === undefined
  ) {
    // last_active_at may legitimately be null depending on implementation; record predicate accordingly
    TestValidator.predicate(
      "refresh: last_active_at is null or updated",
      refreshed.last_active_at === null ||
        refreshed.last_active_at === undefined,
    );
  } else {
    const createdAt = new Date(created.created_at).getTime();
    const lastActiveAt = new Date(refreshed.last_active_at).getTime();
    TestValidator.predicate(
      "refresh: last_active_at is >= created_at",
      lastActiveAt >= createdAt,
    );
  }

  // 3) Smoke-check token usability: attempt to refresh again using the newly issued refresh token
  const secondRefreshRequest = {
    refresh_token: refreshed.token.refresh,
  } satisfies ITodoAppGuest.IRefresh;
  const rotated: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: secondRefreshRequest,
    });
  typia.assert(rotated);

  TestValidator.equals(
    "second refresh: guest id remains the same",
    rotated.id,
    created.id,
  );
  TestValidator.predicate(
    "second refresh: access token present",
    typeof rotated.token?.access === "string" &&
      rotated.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh: refresh token present",
    typeof rotated.token?.refresh === "string" &&
      rotated.token.refresh.length > 0,
  );
}
