import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_registration_token_issuance(
  connection: api.IConnection,
) {
  // Step 1: Generate registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Register new member and receive authentication tokens
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // Step 3: Validate response structure and types
  typia.assert(authorized);

  // Step 4: Validate token structure and JWT format
  const token = authorized.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token contains valid JWT format with three parts",
    token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token contains valid JWT format with three parts",
    token.refresh.split(".").length === 3,
  );

  // Step 5: Validate expiration timestamps are ISO 8601 format
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is valid ISO 8601 date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refresh token expiration is valid ISO 8601 date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Step 6: Validate access token expires sooner than refresh token
  TestValidator.predicate(
    "access token expires before refresh token",
    expiredAtDate.getTime() < refreshableUntilDate.getTime(),
  );

  // Step 7: Validate token expiration times follow typical durations
  const now = new Date();
  const oneHourInMs = 60 * 60 * 1000;
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyMinutesInMs = 30 * 60 * 1000;
  const oneHourTolerance = 60 * 60 * 1000;

  TestValidator.predicate(
    "access token expiration is approximately 1 hour from now",
    Math.abs(expiredAtDate.getTime() - now.getTime() - oneHourInMs) <
      thirtyMinutesInMs,
  );
  TestValidator.predicate(
    "refresh token expiration is approximately 7 days from now",
    Math.abs(refreshableUntilDate.getTime() - now.getTime() - sevenDaysInMs) <
      oneHourTolerance,
  );

  // Step 8: Validate member ID is a valid UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "member ID is a valid UUID format",
    uuidRegex.test(authorized.id),
  );

  // Step 9: Confirm tokens are properly formatted JWT strings with valid Base64 characters
  TestValidator.predicate(
    "access token follows JWT structure with valid Base64url characters",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token.access),
  );
  TestValidator.predicate(
    "refresh token follows JWT structure with valid Base64url characters",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token.refresh),
  );
}
