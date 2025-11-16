import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate successful seller registration via POST /auth/seller/join.
 *
 * Business purpose:
 *
 * - Ensure that a new seller can join the platform in a single unauthenticated
 *   call.
 * - Verify that the backend creates both authentication credentials and seller
 *   profile, and returns an authorized session representation.
 *
 * Steps:
 *
 * 1. Construct a valid IShoppingMallSellerJoin.IRequest payload:
 *
 *    - Email: unique, valid email string
 *    - Password: non-empty string
 *    - StoreName: non-empty string representing storefront name
 *    - ContactPhone: optional but provided, realistic phone string
 * 2. Call api.functional.auth.seller.join with the constructed payload.
 * 3. Assert that the response matches IShoppingMallSeller.IAuthorized using
 *    typia.assert.
 * 4. Validate key business invariants:
 *
 *    - The top-level email and store_name echo the request values.
 *    - The nested seller summary mirrors top-level identity fields.
 *    - Token object (IAuthorizationToken) has non-empty access/refresh strings.
 *
 * No error-path testing is performed here; this is a pure happy-path join
 * scenario.
 */
export async function test_api_seller_join_success_creates_credentials_and_profile(
  connection: api.IConnection,
) {
  // 1. Build a valid join request body
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const storeName: string = RandomGenerator.paragraph({ sentences: 2 });
  const contactPhone: string = RandomGenerator.mobile();

  const body = {
    email,
    password,
    storeName,
    contactPhone,
  } satisfies IShoppingMallSellerJoin.IRequest;

  // 2. Call join endpoint
  const output = await api.functional.auth.seller.join(connection, {
    body,
  });

  // 3. Type-level assertion for the entire authorized seller payload
  typia.assert<IShoppingMallSeller.IAuthorized>(output);

  // 4. Validate top-level identity coherence against request
  TestValidator.equals(
    "seller email should equal requested email",
    output.email,
    email,
  );
  TestValidator.equals(
    "seller store_name should equal requested storeName",
    output.store_name,
    storeName,
  );

  // 5. Validate coherence between top-level fields and nested seller summary
  TestValidator.equals(
    "summary id should equal top-level id",
    output.seller.id,
    output.id,
  );
  TestValidator.equals(
    "summary email should equal top-level email",
    output.seller.email,
    output.email,
  );
  TestValidator.equals(
    "summary store_name should equal top-level store_name",
    output.seller.store_name,
    output.store_name,
  );
  TestValidator.equals(
    "summary status should equal top-level status",
    output.seller.status,
    output.status,
  );

  // 6. Validate token presence and basic invariants (business level)
  const token: IAuthorizationToken = output.token;
  TestValidator.predicate(
    "access token string should be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string should be non-empty",
    token.refresh.length > 0,
  );

  // Date-time fields in token and seller are already validated by typia.assert
}
