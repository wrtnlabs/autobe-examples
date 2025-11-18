import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate role-based access control for the customer-scoped actor security
 * event search endpoint.
 *
 * This test ensures that the admin-only endpoint PATCH
 * /shoppingMall/admin/customers/{customerId}/actorSecurityEvents correctly
 * enforces authentication and authorization rules across different actor
 * types.
 *
 * Business workflow:
 *
 * 1. Attempt to call the endpoint with no Authorization header at all and confirm
 *    that an HTTP client error (4xx) is produced.
 * 2. Join as a customer (POST /auth/customer/join), which authenticates the
 *    connection as a customer actor, and confirm that calling the admin
 *    endpoint with a real customerId fails with an HTTP 4xx error.
 * 3. Join as a seller (POST /auth/seller/join), authenticating the connection as a
 *    seller actor, and again confirm that the admin endpoint call fails with an
 *    HTTP 4xx error.
 * 4. Join as an admin (POST /auth/admin/join), authenticating the connection as an
 *    admin actor, then call the endpoint successfully and verify that the
 *    response is a valid IPageIShoppingMallActorSecurityEvent.ISummary page.
 *
 * Key validations:
 *
 * - The endpoint is not accessible without authentication.
 * - Customer and seller tokens cannot access the admin-only endpoint.
 * - Admin tokens can access successfully and receive a well-typed paginated
 *   response, confirming correct role-based authorization behavior.
 */
export async function test_api_admin_customer_actor_security_events_unauthorized_and_forbidden_access(
  connection: api.IConnection,
) {
  // Step 0: Prepare a customer ID to use for the tests by creating
  // an actual customer first so that we have a real customerId.
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerId: string & tags.Format<"uuid"> = customerAuth.id;

  // Prepare a minimal valid search request body. All fields are optional,
  // so an empty object is a valid IShoppingMallActorSecurityEvent.IRequest.
  const searchBody = {} satisfies IShoppingMallActorSecurityEvent.IRequest;

  // Step 1: Unauthenticated access should fail.
  // Create a separate unauthenticated connection by cloning the base
  // connection and providing an empty headers object.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.httpError(
    "actorSecurityEvents.index should fail without Authorization header",
    [400, 401, 403, 404],
    async () => {
      await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
        unauthConn,
        {
          customerId,
          body: searchBody,
        },
      );
    },
  );

  // Step 2: Customer-authenticated access should fail (forbidden).
  await TestValidator.httpError(
    "actorSecurityEvents.index should reject customer token",
    [400, 401, 403, 404],
    async () => {
      await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
        connection,
        {
          customerId,
          body: searchBody,
        },
      );
    },
  );

  // Step 3: Seller-authenticated access should fail (forbidden).
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  await TestValidator.httpError(
    "actorSecurityEvents.index should reject seller token",
    [400, 401, 403, 404],
    async () => {
      await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
        connection,
        {
          customerId,
          body: searchBody,
        },
      );
    },
  );

  // Step 4: Admin-authenticated access should succeed.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const page: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId,
        body: searchBody,
      },
    );
  typia.assert(page);

  // Basic pagination sanity checks.
  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination.current should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed pagination.limit when limit > 0",
    pagination.limit === 0 || page.data.length <= pagination.limit,
  );
}
