import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test the registration process for a guest user creating a temporary account.
 *
 * This test sends a valid guest registration request with randomized data,
 * including a display name, optional email, IP address, current client URI and
 * referrer, and a secure password. It validates that the response contains a
 * properly structured guest authorization record, including a UUID id, created
 * and updated timestamps, and a JWT authorization token with valid access and
 * refresh tokens and their expiration times.
 *
 * The test ensures the guest registration endpoint is functioning properly and
 * issues valid authentication credentials for the guest session.
 */
export async function test_api_guest_registration(connection: api.IConnection) {
  // Step 1: Prepare a valid guest registration body for join
  const requestBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuest.IJoin;

  // Step 2: Call the guest join API
  const output: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Step 3: Assert the response matches the IAuthorized structure
  typia.assert(output);

  // Step 4: Validate key properties
  TestValidator.predicate(
    "id is a uuid format",
    typeof output.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        output.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof output.created_at === "string" &&
      !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof output.updated_at === "string" &&
      !isNaN(Date.parse(output.updated_at)),
  );
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time string",
    typeof output.token.expired_at === "string" &&
      !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time string",
    typeof output.token.refreshable_until === "string" &&
      !isNaN(Date.parse(output.token.refreshable_until)),
  );
}
