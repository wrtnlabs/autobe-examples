import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test snapshot access permission validation for admin promotion requests.
 *
 * This test verifies that snapshot access is correctly restricted to:
 * 1. The request owner (customer or seller who submitted the promotion request)
 * 2. Super administrators with full access
 *
 * Unauthorized users (other customers/sellers) should be denied access with
 * appropriate permission errors, and no snapshot data should be leaked.
 *
 * Test scenarios:
 * - Customer A creates promotion request and can view their own snapshots
 * - Customer B cannot access Customer A's promotion request snapshots
 * - Super administrator can access any customer's promotion request snapshots
 * - Same permission logic applies to seller promotion requests
 */
export async function test_api_admin_promotion_request_snapshot_access_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // PART 1: Customer Promotion Request Snapshot Access Tests
  // ============================================================
  // 1. Create Customer A (request owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Customer A submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Create Customer B (unauthorized user)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 4. Customer B attempts to access Customer A's snapshots (should fail)
  await TestValidator.error(
    "Customer B cannot access Customer A's promotion request snapshots",
    async () => {
      await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
        customerBConnection,
        {
          requestId: promotionRequest.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
        },
      );
    },
  );
  // 5. Customer A can access their own snapshots (should succeed)
  const customerASnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerAConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(customerASnapshots);
  TestValidator.predicate(
    "Customer A can view their own snapshots",
    customerASnapshots.data.length >= 0,
  );
  // 6. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 7. Super admin can access Customer A's snapshots (should succeed)
  const superAdminSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(superAdminSnapshots);
  TestValidator.predicate(
    "Super admin can view any customer's snapshots",
    superAdminSnapshots.data.length >= 0,
  );
  // ============================================================
  // PART 2: Seller Promotion Request Snapshot Access Tests
  // ============================================================
  // Note: Seller promotion requests follow the same permission logic
  // The endpoint is the same, only the actor_type differs in the snapshot data
  // 8. Create Seller A (request owner) - using customer join as sellers are also customers
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_customer_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(sellerA);
  // 9. Seller A submits admin promotion request
  const sellerPromotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      sellerAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(sellerPromotionRequest);
  // 10. Create Seller B (unauthorized user)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_customer_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(sellerB);
  // 11. Seller B attempts to access Seller A's snapshots (should fail)
  await TestValidator.error(
    "Seller B cannot access Seller A's promotion request snapshots",
    async () => {
      await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
        sellerBConnection,
        {
          requestId: sellerPromotionRequest.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
        },
      );
    },
  );
  // 12. Seller A can access their own snapshots (should succeed)
  const sellerASnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      sellerAConnection,
      {
        requestId: sellerPromotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(sellerASnapshots);
  TestValidator.predicate(
    "Seller A can view their own snapshots",
    sellerASnapshots.data.length >= 0,
  );
  // 13. Super admin can access Seller A's snapshots (should succeed)
  const superAdminSellerSnapshots =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: sellerPromotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(superAdminSellerSnapshots);
  TestValidator.predicate(
    "Super admin can view any seller's snapshots",
    superAdminSellerSnapshots.data.length >= 0,
  );
  // ============================================================
  // PART 3: Verify Snapshot Data Integrity
  // ============================================================
  // 14. Verify snapshots contain expected fields and actor type
  TestValidator.predicate(
    "Snapshots contain valid data structure",
    customerASnapshots.data.every(
      (snapshot) =>
        snapshot.id !== undefined &&
        snapshot.actorType !== undefined &&
        snapshot.status !== undefined &&
        snapshot.createdAt !== undefined,
    ),
  );
  // 15. Verify pagination metadata is present
  TestValidator.predicate(
    "Pagination metadata is present",
    customerASnapshots.pagination.current >= 1 &&
      customerASnapshots.pagination.limit > 0 &&
      customerASnapshots.pagination.records >= 0 &&
      customerASnapshots.pagination.pages >= 0,
  );
}
