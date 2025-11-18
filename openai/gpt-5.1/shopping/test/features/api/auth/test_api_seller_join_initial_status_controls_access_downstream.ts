import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller self-registration join flow and initial status exposure.
 *
 * Business goal:
 *
 * - Ensure that POST /auth/seller/join accepts a realistic
 *   IShoppingMallSellerAuthJoin.IRequest payload and returns a fully populated
 *   IShoppingMallSeller.IAuthorized object, including the authorization token
 *   bundle.
 * - Verify that the join response exposes a meaningful lifecycle status string
 *   and that core identity fields are consistent with the request payload.
 *
 * Scenario notes:
 *
 * - The original high-level plan referenced performing downstream seller actions
 *   to see how initial status (e.g., pending_review vs active) gates access. In
 *   this trimmed environment, only the join endpoint is available, so we cannot
 *   exercise those domain operations.
 * - Instead, we focus on validating that the join response exposes the status
 *   string and token fields correctly, and that the seller identity data is
 *   coherent with the join request.
 *
 * Steps:
 *
 * 1. Build a random but valid join request payload using
 *    IShoppingMallSellerAuthJoin.IRequest. The DTO requires:
 *
 *    - Email: string & tags.Format<"email">
 *    - Password: string & tags.Format<"password">
 *    - Href: string & tags.Format<"uri">
 *    - Referrer: string & tags.Format<"uri">
 *    - Ip?: IPv4/IPv6 or null/undefined We'll use
 *         typia.random<IShoppingMallSellerAuthJoin.IRequest>() to satisfy all
 *         tag constraints instead of hand-crafting values.
 * 2. Call api.functional.auth.seller.join(connection, { body: request }) and
 *    receive an IShoppingMallSeller.IAuthorized result.
 * 3. Use typia.assert<IShoppingMallSeller.IAuthorized>(authorized) to validate
 *    that all structural and tagged format constraints on the authorized seller
 *    object are satisfied.
 * 4. Separately assert the token bundle using
 *    typia.assert<IAuthorizationToken>(authorized.token) to ensure the
 *    access/refresh/expiry fields follow their declared types.
 * 5. Perform business-level consistency checks using TestValidator:
 *
 *    - Seller.id is a non-empty UUID string (typia already enforces format, so we
 *         just predicate non-empty).
 *    - Seller.status is a non-empty string, confirming that join sets some lifecycle
 *         state.
 *    - Seller.email matches the email we sent in the join request.
 */
export async function test_api_seller_join_initial_status_controls_access_downstream(
  connection: api.IConnection,
) {
  // 1. Build random but valid join request payload
  const requestBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  // 2. Call join endpoint
  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: requestBody,
    });

  // 3. Assert full authorized seller structure
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  // 4. Assert token bundle structure
  typia.assert<IAuthorizationToken>(authorized.token);

  // 5. Business-level consistency checks
  TestValidator.predicate(
    "seller id is non-empty UUID string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );

  TestValidator.predicate(
    "seller status is non-empty string",
    typeof authorized.status === "string" && authorized.status.length > 0,
  );

  TestValidator.equals(
    "seller email matches join request email",
    authorized.email,
    requestBody.email,
  );
}
