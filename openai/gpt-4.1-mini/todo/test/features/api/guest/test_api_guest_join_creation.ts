import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_join_creation(
  connection: api.IConnection,
) {
  // Generate valid email and password for guest creation
  const email = `guest_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);

  // Construct the request body with valid data
  const requestBody = { email, password } satisfies ITodoListGuest.ICreate;

  // Call the guest join API to create a new guest user
  const response: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Assert the response structure and types
  typia.assert(response);

  // Validate that the id is a valid UUID string
  TestValidator.predicate(
    "response.id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  // Validate the token contains access and refresh tokens as non-empty strings
  TestValidator.predicate(
    "token.access is a non-empty string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is a non-empty string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Validate the token expiration dates are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "token.expired_at is a valid ISO date-time",
    !isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is a valid ISO date-time",
    !isNaN(Date.parse(response.token.refreshable_until)),
  );
}
