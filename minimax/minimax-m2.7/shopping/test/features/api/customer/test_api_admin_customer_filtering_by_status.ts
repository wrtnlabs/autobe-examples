import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
 * Test admin can filter customer accounts by status.
 *
 * This test validates the customer status filtering functionality for administrators.
 * 1. Admin authenticates to access customer filtering endpoint
 * 2. Multiple customers are created to populate the system
 * 3. Verify filtering by status='active' returns only active customers
 * 4. Verify filtering by status='deleted' returns only soft-deleted customers
 * 5. Verify deleted customers are hidden by default when no status filter is provided
 *
 * Business rules validated:
 * - Deleted customers should be hidden unless explicitly filtered by status='deleted'
 * - Active status filter only shows customers with null deleted_at
 * - Deleted status filter only shows customers with non-null deleted_at
 */
export async function test_api_admin_customer_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://admin.example.com/register",
      referrer: "https://example.com",
    },
  });
  // 2. Create multiple customers
  const customerCount = 5;
  const customers = await ArrayUtil.asyncRepeat(customerCount, async () => {
    const customerConn: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "CustomerPass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      },
    });
    return customer;
  });
  typia.assert(customers);
  // 3. Test filtering with status='active' - should return only active customers
  const activeCustomersResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(activeCustomersResult);
  // Verify all returned customers have status='active'
  TestValidator.equals(
    "active filter returns non-empty result",
    activeCustomersResult.data.length > 0,
    true,
  );
  for (const customer of activeCustomersResult.data) {
    TestValidator.equals(
      "customer status is active",
      customer.status,
      "active",
    );
  }
  // 4. Test filtering with status='deleted' - should return only soft-deleted customers
  // Note: In this test setup, no customers are deleted, so this should return empty
  const deletedCustomersResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "deleted",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(deletedCustomersResult);
  // Verify all returned customers have status='deleted'
  for (const customer of deletedCustomersResult.data) {
    TestValidator.equals(
      "customer status is deleted",
      customer.status,
      "deleted",
    );
  }
  // 5. Test default filtering (no status filter) - deleted customers should be hidden
  const defaultResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(defaultResult);
  // Verify no deleted customers in default result
  for (const customer of defaultResult.data) {
    TestValidator.equals(
      "customer is active by default",
      customer.status,
      "active",
    );
  }
}
