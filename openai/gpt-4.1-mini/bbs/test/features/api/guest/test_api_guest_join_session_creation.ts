import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_join_session_creation(
  connection: api.IConnection,
) {
  // Call the guest join API with an empty request body
  const output: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IGuest.IJoin,
    });

  // Assert the output type fully to ensure response validity
  typia.assert(output);

  // Validate that the 'id' is a non-empty UUID string
  TestValidator.predicate(
    "guest session id is a non-empty UUID",
    typeof output.id === "string" && output.id.length > 0,
  );

  // Validate access token is a non-empty string
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );

  // Validate refresh token is a non-empty string
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );

  // Validate expired_at conforms to ISO date-time format with future date
  TestValidator.predicate(
    "expired_at is ISO 8601 datetime string and in the future",
    typeof output.token.expired_at === "string" &&
      !Number.isNaN(Date.parse(output.token.expired_at)) &&
      new Date(output.token.expired_at).getTime() > Date.now(),
  );

  // Validate refreshable_until conforms to ISO date-time format with future date
  TestValidator.predicate(
    "refreshable_until is ISO 8601 datetime string and in the future",
    typeof output.token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(output.token.refreshable_until)) &&
      new Date(output.token.refreshable_until).getTime() > Date.now(),
  );
}
