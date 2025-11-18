import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Validate admin seller session detail endpoint cross-tenant behavior using
 * available APIs and DTOs.
 *
 * Business goal from the original scenario:
 *
 * - Ensure that GET /shoppingMall/admin/sellers/{sellerId}/sessions/{sessionId}
 *   is properly scoped by sellerId and does not leak cross-tenant session
 *   information.
 *
 * Practical constraints in this codebase:
 *
 * - We do not have any API that returns concrete seller session IDs (no listing
 *   endpoint, and login/join responses don’t expose sessionId).
 * - We are forbidden from testing specific HTTP status codes directly.
 * - The SDK’s simulate mode and existing mock tests for sessions.at already use
 *   random UUIDs for sellerId/sessionId.
 *
 * Given those constraints, this test focuses on what is implementable and
 * compiler-safe:
 *
 * 1. Bootstrap an admin:
 *
 *    - Call POST /auth/admin/join with IShoppingMallAdminJoin.ICreate using
 *         typia.random to generate a valid join payload.
 *    - This sets connection.headers.Authorization to the admin’s access token for
 *         subsequent admin-only calls.
 * 2. Create two sellers (sellerA and sellerB):
 *
 *    - Call POST /auth/seller/join twice with IShoppingMallSellerAuthJoin.IRequest
 *         using typia.random for each payload.
 *    - Capture sellerA.id and sellerB.id from the IShoppingMallSeller.IAuthorized
 *         responses.
 *    - These joins implicitly create seller session rows in the backend, but we
 *         still do not have explicit session IDs.
 * 3. As authenticated admin, call the seller session detail endpoint:
 *
 *    - Generate a random UUID value to use as sessionId (mirroring the existing mock
 *         session test pattern).
 *    - Call GET /shoppingMall/admin/sellers/{sellerId}/sessions/{sessionId} via
 *         api.functional.shoppingMall.admin.sellers.sessions.at: a) First with
 *         sellerId = sellerA.id and the random sessionId. b) Then with sellerId
 *         = sellerB.id and the same sessionId.
 * 4. Validate responses structurally and in terms of seller scoping:
 *
 *    - For each call, typia.assert the returned IShoppingMallSellerSession to
 *         guarantee it matches the DTO definition.
 *    - Use TestValidator.equals to assert that response.seller.id equals the
 *         sellerId path parameter used for the request. This checks that, from
 *         the perspective of the DTO, the admin view is scoped by the seller
 *         path parameter and that the embedded seller summary is consistent
 *         with that scope.
 *
 * Note:
 *
 * - We intentionally do not assert HTTP 404/403 codes because the testing
 *   utilities and constraints for this project do not allow status-code-based
 *   validation here.
 * - We also do not attempt to validate real database-backed session ownership
 *   because we lack an API that exposes concrete session identifiers.
 */
export async function test_api_admin_get_seller_session_not_found_for_wrong_seller(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account and authenticate it via join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two distinct sellers via seller join
  const sellerAJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  const sellerBJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  // 3. As authenticated admin, call the seller session detail endpoint
  // Use a random UUID as the sessionId path parameter, mirroring existing
  // generated tests for this endpoint.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3a. Call with sellerA.id and the random sessionId ("correct" seller
  // context with arbitrary session id)
  const sessionForSellerA: IShoppingMallSellerSession =
    await api.functional.shoppingMall.admin.sellers.sessions.at(connection, {
      sellerId: sellerA.id,
      sessionId,
    });
  typia.assert(sessionForSellerA);

  // Validate that the embedded seller summary is consistent with sellerA
  TestValidator.equals(
    "session for sellerA should be scoped to sellerA id",
    sessionForSellerA.seller.id,
    sellerA.id,
  );

  // 3b. Call with sellerB.id and the same sessionId to simulate a
  // cross-tenant lookup scenario
  const sessionForSellerB: IShoppingMallSellerSession =
    await api.functional.shoppingMall.admin.sellers.sessions.at(connection, {
      sellerId: sellerB.id,
      sessionId,
    });
  typia.assert(sessionForSellerB);

  // Validate that the embedded seller summary is consistent with sellerB
  TestValidator.equals(
    "session for sellerB should be scoped to sellerB id even with same sessionId path value",
    sessionForSellerB.seller.id,
    sellerB.id,
  );
}
