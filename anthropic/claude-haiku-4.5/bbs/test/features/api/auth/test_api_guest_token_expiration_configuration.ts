import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_guest_token_expiration_configuration(
  connection: api.IConnection,
) {
  // Record the current time before making the request
  const beforeRequestTime = new Date();

  // Create a guest user and retrieve authorization tokens
  const guestAuth = await api.functional.auth.guest.join(connection);
  typia.assert(guestAuth);

  // Record the time after the request
  const afterRequestTime = new Date();

  // Validate that the response has required structure
  TestValidator.predicate(
    "guest authorization response should contain id",
    guestAuth.id !== undefined && guestAuth.id !== null,
  );

  TestValidator.predicate(
    "guest authorization response should contain token object",
    guestAuth.token !== undefined && guestAuth.token !== null,
  );

  // Extract the token object for detailed validation
  const token = guestAuth.token;

  // Validate token structure
  TestValidator.predicate(
    "token should have access property",
    token.access !== undefined &&
      token.access !== null &&
      token.access.length > 0,
  );

  TestValidator.predicate(
    "token should have refresh property",
    token.refresh !== undefined &&
      token.refresh !== null &&
      token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token should have expired_at property",
    token.expired_at !== undefined && token.expired_at !== null,
  );

  TestValidator.predicate(
    "token should have refreshable_until property",
    token.refreshable_until !== undefined && token.refreshable_until !== null,
  );

  // Validate that expired_at is a valid ISO 8601 date-time string
  TestValidator.predicate(
    "expired_at should be valid ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );

  // Validate that refreshable_until is a valid ISO 8601 date-time string
  TestValidator.predicate(
    "refreshable_until should be valid ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );

  // Parse the expiration timestamps
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);

  // Validate that both timestamps are valid dates
  TestValidator.predicate(
    "expired_at should parse to valid Date",
    !isNaN(expiredAtDate.getTime()),
  );

  TestValidator.predicate(
    "refreshable_until should parse to valid Date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Validate that expired_at is in the future (after request time)
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAtDate.getTime() > afterRequestTime.getTime(),
  );

  // Validate that refreshable_until is in the future
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntilDate.getTime() > afterRequestTime.getTime(),
  );

  // Validate that refreshable_until extends beyond expired_at
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );

  // Validate the time difference makes sense (refreshable_until should be significantly after expired_at)
  const timeDifference =
    refreshableUntilDate.getTime() - expiredAtDate.getTime();
  TestValidator.predicate(
    "refreshable_until should extend at least some time beyond expired_at",
    timeDifference > 0,
  );
}
