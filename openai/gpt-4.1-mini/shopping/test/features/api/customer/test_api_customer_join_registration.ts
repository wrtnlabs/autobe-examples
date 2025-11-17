import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_join_registration(
  connection: api.IConnection,
) {
  // 1. Generate unique valid email for customer registration
  const email = `user_${RandomGenerator.alphaNumeric(12)}@example.com`;

  // 2. Generate password
  const password = `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`;

  // 3. Provide session context URLs
  const href = `https://example.com/signup?ref=${RandomGenerator.alphaNumeric(6)}`;
  const referrer = `https://example.com/referrer?src=ad_${RandomGenerator.alphaNumeric(4)}`;

  // 4. Call join API endpoint with properly structured body
  const response = await api.functional.auth.customer.join(connection, {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
    } satisfies IShoppingMallCustomer.ICreate,
  });

  // 5. Strongly validate response using typia.assert
  typia.assert(response);

  // 6. Validate email consistency
  TestValidator.equals(
    "Response email should match request email",
    response.email,
    email,
  );

  // 7. Validate token object keys exist and are strings
  TestValidator.predicate(
    "Token access is a non-empty string",
    () =>
      typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "Token refresh is a non-empty string",
    () =>
      typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expired_at is valid ISO 8601 date",
    () => !Number.isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "Token refreshable_until is valid ISO 8601 date",
    () => !Number.isNaN(Date.parse(response.token.refreshable_until)),
  );
}
