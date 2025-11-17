import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration(
  connection: api.IConnection,
) {
  // Generate a unique email and password for the new seller
  const email = typia.random<string>();
  const password = RandomGenerator.alphaNumeric(12); // Secure alphanumeric password

  // Prepare the request body according to IShoppingMallSeller.ICreate
  const requestBody = {
    email: email,
    password: password,
  } satisfies IShoppingMallSeller.ICreate;

  // Call join endpoint to register a new seller
  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: requestBody,
  });

  // Assert the response type is IShoppingMallSeller.IAuthorized and values
  typia.assert(authorizedSeller);

  // Validate that ID is a UUID string
  TestValidator.predicate(
    "seller id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorizedSeller.id,
    ),
  );

  // Validate that email matches our input
  TestValidator.equals("seller email matches", authorizedSeller.email, email);

  // Validate created_at and updated_at are ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO_date-time",
    !isNaN(Date.parse(authorizedSeller.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO_date-time",
    !isNaN(Date.parse(authorizedSeller.updated_at)),
  );

  // Validate token presence and structure
  const token = authorizedSeller.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at is ISO_date-time",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO_date-time",
    !isNaN(Date.parse(token.refreshable_until)),
  );

  // password_hash should be absent or null for security
  TestValidator.predicate(
    "password_hash is null or undefined",
    authorizedSeller.password_hash === null ||
      authorizedSeller.password_hash === undefined,
  );
}
