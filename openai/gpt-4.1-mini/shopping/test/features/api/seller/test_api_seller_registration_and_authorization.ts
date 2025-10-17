import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_and_authorization(
  connection: api.IConnection,
) {
  // 1. Construct a valid seller creation request with required and optional fields.
  const email = `seller_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const passwordHash = RandomGenerator.alphaNumeric(40); // Simulated hashed password
  const createBody: IShoppingMallSeller.ICreate = {
    email: email,
    password_hash: passwordHash,
    company_name: `Company_${RandomGenerator.alphaNumeric(5)}`,
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  };

  // 2. Make the API call to register the seller.
  const output: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: createBody,
    });

  // 3. Assert the response data strictly matches the expected authorization schema.
  typia.assert(output);

  // 4. Validate essential fields are present and valid.
  TestValidator.predicate(
    "seller id is non-empty UUID",
    typeof output.id === "string" && /^[0-9a-fA-F\-]{36}$/.test(output.id),
  );
  TestValidator.predicate("email matches input", output.email === email);
  TestValidator.predicate(
    "status is 'active' or 'suspended'",
    output.status === "active" || output.status === "suspended",
  );

  // 5. Validate tokens existence and non-empty strings.
  TestValidator.predicate(
    "access token is present",
    output.token !== null &&
      typeof output.token.access === "string" &&
      output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    output.token !== null &&
      typeof output.token.refresh === "string" &&
      output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration times are valid ISO strings",
    typeof output.token.expired_at === "string" &&
      typeof output.token.refreshable_until === "string",
  );

  // 6. Test error cases with invalid data.
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.auth.seller.join(connection, {
      body: {
        email: "invalid-email",
        password_hash: passwordHash,
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  });

  // 7. Confirm authorization by ensuring output.token.access is non-empty string.
  TestValidator.predicate(
    "authorization token is properly issued",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
}
