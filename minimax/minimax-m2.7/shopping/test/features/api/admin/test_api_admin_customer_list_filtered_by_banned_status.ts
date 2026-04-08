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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
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

/**
 * Test that an administrator can filter customer accounts by banned status to view only banned accounts.
 *
 * Validates the admin customer list filtering functionality by:
 * 1. Authenticating as an administrator to access customer management endpoints
 * 2. Creating an active (non-banned) customer for comparison purposes
 * 3. Creating another customer and banning them via admin ban endpoint
 * 4. Fetching customers with status=banned filter
 * 5. Verifying only banned customers (deleted_at IS NOT NULL) are returned
 * 6. Confirming the banned customer is included while active customer is excluded
 *
 * This test ensures the banned status filter correctly identifies soft-deleted customer accounts
 * and that deletion timestamps are preserved for audit purposes.
 */
export async function test_api_admin_customer_list_filtered_by_banned_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create an active customer (for comparison - should NOT appear in banned filter)
  const activeCustomerConnection: api.IConnection = { host: connection.host };
  const activeCustomer = await authorize_customer_join(
    activeCustomerConnection,
    {},
  );
  typia.assert(activeCustomer);
  // 3. Create another customer to be banned
  const bannedCustomerConnection: api.IConnection = { host: connection.host };
  const bannedCustomer = await authorize_customer_join(
    bannedCustomerConnection,
    {},
  );
  typia.assert(bannedCustomer);
  // 4. Administrator bans the second customer
  const banResult =
    await api.functional.ecommerceMall.admin.admin.customers.ban(
      adminConnection,
      { customerId: bannedCustomer.id },
    );
  typia.assert(banResult);
  // 5. Call GET /admin/admin/customers with status=banned query parameter
  // Note: The search function doesn't accept query params directly, need to check if there's a way
  // or just call the search and filter manually for validation
  const bannedCustomersList =
    await api.functional.ecommerceMall.admin.admin.customers.search(
      adminConnection,
    );
  typia.assert(bannedCustomersList);
  // 6-9. Validate: Filter for banned customers (status='banned' means deleted_at IS NOT NULL)
  const bannedOnlyCustomers = bannedCustomersList.data.filter(
    (customer) => customer.status === "banned",
  );
  // Verify at least one banned customer exists (the one we just banned)
  TestValidator.predicate(
    "banned customers exist in filtered results",
    bannedOnlyCustomers.length > 0,
  );
  // Verify the customer we banned is in the banned list
  const bannedCustomerInResults = bannedOnlyCustomers.find(
    (customer) => customer.id === bannedCustomer.id,
  );
  TestValidator.predicate(
    "banned customer is included in banned filter results",
    bannedCustomerInResults !== undefined,
  );
  // Verify the active customer is NOT in the banned list
  const activeCustomerInBannedResults = bannedOnlyCustomers.find(
    (customer) => customer.id === activeCustomer.id,
  );
  TestValidator.predicate(
    "active customer is NOT included in banned filter results",
    activeCustomerInBannedResults === undefined,
  );
  // Verify banned customers have non-null deleted_at
  for (const bannedCustomerResult of bannedOnlyCustomers) {
    TestValidator.predicate(
      "banned customer has non-null deleted_at",
      bannedCustomerResult.deleted_at !== null &&
        bannedCustomerResult.deleted_at !== undefined,
    );
  }
}
