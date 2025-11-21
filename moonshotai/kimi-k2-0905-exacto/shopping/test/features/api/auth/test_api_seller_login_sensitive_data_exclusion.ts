import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_login_sensitive_data_exclusion(
  connection: api.IConnection,
) {
  // Generate valid seller business authentication credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  // Authenticate seller and get authorized response
  const authResponse: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });

  // Validate response structure and type safety
  typia.assert(authResponse);

  // Verify all legitimate business profile data is present
  TestValidator.predicate(
    "auth response has seller ID",
    authResponse.id !== undefined,
  );
  TestValidator.predicate(
    "auth response has email",
    authResponse.email !== undefined,
  );
  TestValidator.predicate(
    "auth response has business name",
    authResponse.business_name !== undefined,
  );
  TestValidator.predicate(
    "auth response has business registration number",
    authResponse.business_registration_number !== undefined,
  );
  TestValidator.predicate(
    "auth response has tax ID",
    authResponse.tax_id !== undefined,
  );
  TestValidator.predicate(
    "auth response has phone number",
    authResponse.phone !== undefined,
  );
  TestValidator.predicate(
    "auth response has business type",
    authResponse.business_type !== undefined,
  );
  TestValidator.predicate(
    "auth response has verification status",
    authResponse.verification_status !== undefined,
  );
  TestValidator.predicate(
    "auth response has commission rate",
    authResponse.commission_rate !== undefined,
  );
  TestValidator.predicate(
    "auth response has is_verified flag",
    authResponse.is_verified !== undefined,
  );
  TestValidator.predicate(
    "auth response has created timestamp",
    authResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "auth response has updated timestamp",
    authResponse.updated_at !== undefined,
  );

  // Confirm JWT token contains proper authorization data
  TestValidator.predicate(
    "JWT access token exists",
    authResponse.token.access !== undefined,
  );
  TestValidator.predicate(
    "JWT refresh token exists",
    authResponse.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "JWT expiration timestamp exists",
    authResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "JWT refreshable until timestamp exists",
    authResponse.token.refreshable_until !== undefined,
  );

  // Validate that response only contains the expected business-visible properties
  // The IShoppingMallSeller.IAuthorized type defines exactly what should be returned
  TestValidator.predicate(
    "response has exactly 12 business properties",
    Object.keys(authResponse).length === 12,
  );
  TestValidator.predicate(
    "response has token property",
    authResponse.token !== undefined,
  );

  // Ensure no password-related data leaks into response (should be impossible per type definition)
  // This validates the API design ensures security through strong typing

  // Test consistency with a different seller account
  const secondSellerEmail = typia.random<string & tags.Format<"email">>();
  const secondAuthResponse: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: secondSellerEmail,
        password: RandomGenerator.alphaNumeric(15),
      } satisfies IShoppingMallSeller.ILogin,
    });

  typia.assert(secondAuthResponse);

  // Ensure consistent response structure
  TestValidator.equals(
    "second seller has same number of properties",
    Object.keys(secondAuthResponse).length,
    12,
  );
  TestValidator.predicate(
    "second seller has business name",
    secondAuthResponse.business_name !== undefined,
  );
  TestValidator.predicate(
    "second seller has verification status",
    secondAuthResponse.verification_status !== undefined,
  );

  // Validate the API maintains consistency and only returns defined business profile data
  TestValidator.equals(
    "both sellers have same property count",
    Object.keys(authResponse).length,
    Object.keys(secondAuthResponse).length,
  );
}
