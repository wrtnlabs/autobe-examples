import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_user_registration_with_unique_nickname(
  connection: api.IConnection,
) {
  // Generate a unique nickname for the new guest user
  const nickname = RandomGenerator.name();

  // Prepare request body
  const requestBody = { nickname } satisfies ITodoListGuest.ICreate;

  // Call the guest join API
  const authorizedGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join.joinGuest(connection, {
      body: requestBody,
    });
  typia.assert(authorizedGuest);

  // Validate the response fields
  TestValidator.predicate(
    "authorized guest id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedGuest.id,
    ),
  );

  TestValidator.equals(
    "authorized guest nickname matches request",
    authorizedGuest.nickname,
    nickname,
  );

  TestValidator.predicate(
    "authorization token access is non-empty string",
    typeof authorizedGuest.token.access === "string" &&
      authorizedGuest.token.access.length > 0,
  );

  TestValidator.predicate(
    "authorization token refresh is non-empty string",
    typeof authorizedGuest.token.refresh === "string" &&
      authorizedGuest.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "authorization token expired_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      authorizedGuest.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "authorization token refreshable_until is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      authorizedGuest.token.refreshable_until,
    ),
  );

  TestValidator.predicate(
    "created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      authorizedGuest.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      authorizedGuest.updated_at,
    ),
  );
}
