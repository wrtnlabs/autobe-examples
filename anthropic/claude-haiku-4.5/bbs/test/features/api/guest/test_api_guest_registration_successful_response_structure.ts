import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_registration_successful_response_structure(
  connection: api.IConnection,
) {
  // Register a new guest user with optional device identifier
  const response: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IDiscussionBoardGuest.ICreate,
    });

  // Validate the response structure
  typia.assert(response);

  // Verify id is a valid UUID
  TestValidator.predicate(
    "id should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  // Verify created_at is a valid ISO 8601 datetime string
  TestValidator.predicate(
    "created_at should be valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/i.test(
      response.created_at,
    ),
  );

  // Verify the created_at timestamp is recent (within last minute)
  const createdAtDate = new Date(response.created_at);
  const now = new Date();
  const timeDifferenceMs = now.getTime() - createdAtDate.getTime();
  TestValidator.predicate(
    "created_at should be recent timestamp",
    timeDifferenceMs >= 0 && timeDifferenceMs < 60000,
  );

  // Verify token object exists and contains required fields
  TestValidator.predicate(
    "token object should exist",
    response.token !== null && response.token !== undefined,
  );

  // Verify token.access is a non-empty string (JWT format)
  TestValidator.predicate(
    "token.access should be a valid JWT string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );

  // Verify token.refresh is a non-empty string (JWT format)
  TestValidator.predicate(
    "token.refresh should be a valid JWT string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Verify token.expired_at is a valid ISO 8601 datetime string
  TestValidator.predicate(
    "token.expired_at should be valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/i.test(
      response.token.expired_at,
    ),
  );

  // Verify token.refreshable_until is a valid ISO 8601 datetime string
  TestValidator.predicate(
    "token.refreshable_until should be valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/i.test(
      response.token.refreshable_until,
    ),
  );

  // Verify expiration timestamps are in the future
  const expiredAtDate = new Date(response.token.expired_at);
  const refreshableUntilDate = new Date(response.token.refreshable_until);
  const nowTime = new Date().getTime();

  TestValidator.predicate(
    "token.expired_at should be in the future",
    expiredAtDate.getTime() > nowTime,
  );

  TestValidator.predicate(
    "token.refreshable_until should be in the future and after expired_at",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );

  // Verify response can be serialized to JSON (client-side compatibility)
  TestValidator.predicate(
    "response should be JSON serializable",
    (() => {
      try {
        JSON.stringify(response);
        return true;
      } catch {
        return false;
      }
    })(),
  );

  // Verify device_identifier is either undefined or null (not provided in request)
  TestValidator.predicate(
    "device_identifier should be null or undefined when not provided",
    response.device_identifier === null ||
      response.device_identifier === undefined,
  );
}
