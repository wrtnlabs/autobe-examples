import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";

/**
 * Validates JWT token refresh mechanism for guest users.
 *
 * Ensures that a guest user can obtain new access tokens by providing a valid
 * refresh token.
 *
 * Steps:
 *
 * 1. Register a new guest user and obtain initial authorization tokens.
 * 2. Submit a token refresh request using the received refresh token.
 * 3. Validate that new authorization tokens are issued and conform to expected
 *    types.
 */
export async function test_api_auth_guest_token_refresh(
  connection: api.IConnection,
) {
  // 1. Register a guest user
  const createBody = {
    nickname: RandomGenerator.name(),
    client_version: "1.0.0",
    ip: "127.0.0.1",
    href: "https://example.com/guest",
    referrer: "https://example.com",
  } satisfies ITodoListTodoListGuest.ICreate;

  const joinOutput: ITodoListTodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createBody,
    });
  typia.assert(joinOutput);

  // 2. Refresh token using the refresh token from join response
  const refreshBody = {
    refresh_token: joinOutput.token.refresh,
  } satisfies ITodoListTodoListGuest.IRefresh;

  const refreshOutput: ITodoListTodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshOutput);

  // 3. Validation
  TestValidator.predicate(
    "refreshOutput ID must be string UUID",
    typeof refreshOutput.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        refreshOutput.id,
      ),
  );
  TestValidator.predicate(
    "refreshOutput token must have access string",
    typeof refreshOutput.token.access === "string" &&
      refreshOutput.token.access.length > 10,
  );
  TestValidator.predicate(
    "refreshOutput token must have refresh string",
    typeof refreshOutput.token.refresh === "string" &&
      refreshOutput.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "refreshOutput token expired_at must be ISO date-time string",
    typeof refreshOutput.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        refreshOutput.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "refreshOutput token refreshable_until must be ISO date-time string",
    typeof refreshOutput.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        refreshOutput.token.refreshable_until,
      ),
  );
}
