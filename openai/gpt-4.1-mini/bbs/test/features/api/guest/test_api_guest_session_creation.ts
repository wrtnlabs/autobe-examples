import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_session_creation(
  connection: api.IConnection,
) {
  // Generate a unique session token for guest
  const sessionToken: string = RandomGenerator.alphaNumeric(32);

  // Build request body according to IDiscussionBoardGuest.ICreate
  const requestBody = {
    session_token: sessionToken,
  } satisfies IDiscussionBoardGuest.ICreate;

  // Create a new guest session by calling the API
  const response: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join.joinGuest(connection, {
      body: requestBody,
    });

  // Assert response type and properties
  typia.assert(response);

  // Validate UUID format for guest ID
  TestValidator.predicate(
    "guest id format is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  // Validate presence of authorization token properties
  TestValidator.predicate(
    "authorization token has access string",
    typeof response.token.access === "string",
  );
  TestValidator.predicate(
    "authorization token has refresh string",
    typeof response.token.refresh === "string",
  );

  // Check expiration timestamp format
  TestValidator.predicate(
    "authorization token expired_at is ISO string",
    typeof response.token.expired_at === "string" &&
      !isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "authorization token refreshable_until is ISO string",
    typeof response.token.refreshable_until === "string" &&
      !isNaN(Date.parse(response.token.refreshable_until)),
  );

  // Make a second guest session with a different token to verify uniqueness
  const anotherSessionToken: string = RandomGenerator.alphaNumeric(32);
  const anotherRequestBody = {
    session_token: anotherSessionToken,
  } satisfies IDiscussionBoardGuest.ICreate;

  const secondResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join.joinGuest(connection, {
      body: anotherRequestBody,
    });
  typia.assert(secondResponse);

  // Ensure the second guest ID is different from the first
  TestValidator.notEquals(
    "second guest id is different",
    response.id,
    secondResponse.id,
  );

  // Ensure the second token's access token is a string
  TestValidator.predicate(
    "second authorization token has access string",
    typeof secondResponse.token.access === "string",
  );

  // Ensure token expiration times are ISO strings
  TestValidator.predicate(
    "second authorization token expired_at is ISO string",
    typeof secondResponse.token.expired_at === "string" &&
      !isNaN(Date.parse(secondResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "second authorization token refreshable_until is ISO string",
    typeof secondResponse.token.refreshable_until === "string" &&
      !isNaN(Date.parse(secondResponse.token.refreshable_until)),
  );
}
