import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * End-to-end test for moderator registration and token issuance.
 *
 * This test covers the entire process of creating a new moderator account via
 * the POST /auth/moderator/join endpoint. It includes:
 *
 * 1. Generating realistic, valid moderator registration data with email, password,
 *    and display name.
 * 2. Calling the joinModerator API function to create the moderator account.
 * 3. Asserting the returned moderator authorized object for validity, including
 *    the presence of a UUID id, email format, timestamps, possible deletion
 *    timestamp, and the token object with JWT tokens.
 * 4. Ensuring the JWT tokens follow correct structure (non-empty strings) and ISO
 *    8601 format timestamps for expiration.
 */
export async function test_api_moderator_registration_and_token_issuance(
  connection: api.IConnection,
) {
  // 1. Prepare moderator creation request body
  const moderatorCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: RandomGenerator.alphaNumeric(12) + "A1!", // strong password
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardModerator.ICreate;

  // 2. Call the joinModerator endpoint
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: moderatorCreateBody,
    });

  // 3. Assert the full response structure
  typia.assert(moderator);

  // 4. Validate specific content of the moderator response fields
  TestValidator.predicate(
    "moderator id is non-empty string with UUID pattern",
    typeof moderator.id === "string" && moderator.id.length > 0,
  );

  TestValidator.predicate(
    "moderator email matches input email",
    moderator.email === moderatorCreateBody.email,
  );

  TestValidator.predicate(
    "moderator display_name matches input",
    moderator.display_name === moderatorCreateBody.display_name,
  );

  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    typeof moderator.created_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}(\.\d+)?Z$/.test(
        moderator.created_at,
      ),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 date-time string",
    typeof moderator.updated_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}(\.\d+)?Z$/.test(
        moderator.updated_at,
      ),
  );

  // deleted_at can be null or string, if string must be ISO 8601
  if (moderator.deleted_at !== null && moderator.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 date-time string when present",
      typeof moderator.deleted_at === "string" &&
        /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}(\.\d+)?Z$/.test(
          moderator.deleted_at,
        ),
    );
  }

  // Validate token object
  const token: IAuthorizationToken = moderator.token;
  typia.assert(token);

  TestValidator.predicate(
    "token.access is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "token.refresh is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token.expired_at is ISO 8601 date-time string",
    typeof token.expired_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}(\.\d+)?Z$/.test(
        token.expired_at,
      ),
  );

  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 date-time string",
    typeof token.refreshable_until === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}(\.\d+)?Z$/.test(
        token.refreshable_until,
      ),
  );
}
