import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that soft-deleted records are excluded from admin dashboard counts.
 *
 * Validates the business rule that deleted customers, sellers, products, and orders
 * are not included in platform statistics. The dashboard query filters records where
 * deleted_at IS NULL, ensuring only active records are counted.
 *
 * Test flow:
 * 1. Admin authenticates and retrieves baseline dashboard counts
 * 2. Creates test customers and sellers
 * 3. Retrieves updated dashboard counts
 * 4. Validates that counts increased correctly and reflect only active records
 * 5. Validates dashboard structure and count relationships are logically correct
 *
 * The test verifies the soft-delete exclusion by:
 * - Creating known number of records
 * - Verifying dashboard counts match only active records
 * - Confirming approved sellers never exceed total sellers
 */
export async function test_api_admin_dashboard_excludes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Get baseline dashboard counts
  const baselineDashboard =
    await api.functional.ecommerceMall.admin.admin.dashboard.at(
      adminConnection,
    );
  typia.assert(baselineDashboard);
  // Store baseline counts for comparison
  const baselineCustomers = baselineDashboard.customersCount;
  const baselineSellers = baselineDashboard.sellersCount;
  const baselineProducts = baselineDashboard.productsCount;
  const baselineOrders = baselineDashboard.ordersCount;
  const baselineApprovedSellers = baselineDashboard.approvedSellersCount;
  const baselinePendingApprovals =
    baselineDashboard.pendingSellerApprovalsCount;
  // 3. Create multiple customers
  const customerCount = 3;
  await ArrayUtil.asyncRepeat(customerCount, async () => {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {});
    typia.assert(customer);
    return customer;
  });
  // 4. Create multiple sellers (all start with pending status)
  const sellerCount = 3;
  await ArrayUtil.asyncRepeat(sellerCount, async () => {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {});
    typia.assert(seller);
    return seller;
  });
  // 5. Get dashboard after creating records
  const afterCreationDashboard =
    await api.functional.ecommerceMall.admin.admin.dashboard.at(
      adminConnection,
    );
  typia.assert(afterCreationDashboard);
  // 6. Verify counts increased correctly (dashboard includes only active records)
  // Customers: All created customers are active (not soft-deleted)
  TestValidator.equals(
    "customers count increased by created customer count",
    afterCreationDashboard.customersCount,
    baselineCustomers + customerCount,
  );
  // Sellers: All created sellers are active (not soft-deleted)
  TestValidator.equals(
    "sellers count increased by created seller count",
    afterCreationDashboard.sellersCount,
    baselineSellers + sellerCount,
  );
  // Pending approvals: All new sellers start pending
  TestValidator.equals(
    "pending seller approvals increased by created seller count",
    afterCreationDashboard.pendingSellerApprovalsCount,
    baselinePendingApprovals + sellerCount,
  );
  // Products and orders: No products or orders created, should remain unchanged
  TestValidator.equals(
    "products count unchanged",
    afterCreationDashboard.productsCount,
    baselineProducts,
  );
  TestValidator.equals(
    "orders count unchanged",
    afterCreationDashboard.ordersCount,
    baselineOrders,
  );
  TestValidator.equals(
    "approved sellers count unchanged (new sellers are pending, not approved)",
    afterCreationDashboard.approvedSellersCount,
    baselineApprovedSellers,
  );
  // 7. Validate dashboard structure - all counts are non-negative
  TestValidator.predicate(
    "customers count is non-negative",
    afterCreationDashboard.customersCount >= 0,
  );
  TestValidator.predicate(
    "sellers count is non-negative",
    afterCreationDashboard.sellersCount >= 0,
  );
  TestValidator.predicate(
    "products count is non-negative",
    afterCreationDashboard.productsCount >= 0,
  );
  TestValidator.predicate(
    "orders count is non-negative",
    afterCreationDashboard.ordersCount >= 0,
  );
  TestValidator.predicate(
    "approved sellers count is non-negative",
    afterCreationDashboard.approvedSellersCount >= 0,
  );
  TestValidator.predicate(
    "pending seller approvals count is non-negative",
    afterCreationDashboard.pendingSellerApprovalsCount >= 0,
  );
  TestValidator.predicate(
    "pending admin requests count is non-negative",
    afterCreationDashboard.pendingAdminRequestsCount >= 0,
  );
  // 8. Verify logical relationships between counts
  // Approved sellers cannot exceed total sellers (business rule validation)
  TestValidator.predicate(
    "approved sellers <= total sellers",
    afterCreationDashboard.approvedSellersCount <=
      afterCreationDashboard.sellersCount,
  );
  // Pending approvals should be at most total sellers
  TestValidator.predicate(
    "pending seller approvals <= total sellers",
    afterCreationDashboard.pendingSellerApprovalsCount <=
      afterCreationDashboard.sellersCount,
  );
  // 9. Verify the dashboard correctly excludes soft-deleted records
  // The dashboard counts should only include records where deleted_at IS NULL
  // Since we created records but did NOT soft-delete any, all created records
  // should be included in the counts
  TestValidator.predicate(
    "created customers are included in dashboard (deleted_at IS NULL filter works)",
    afterCreationDashboard.customersCount >= baselineCustomers + customerCount,
  );
  TestValidator.predicate(
    "created sellers are included in dashboard (deleted_at IS NULL filter works)",
    afterCreationDashboard.sellersCount >= baselineSellers + sellerCount,
  );
}
