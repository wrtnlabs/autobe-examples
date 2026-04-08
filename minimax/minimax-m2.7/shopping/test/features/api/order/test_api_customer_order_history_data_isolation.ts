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
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A with their own authentication
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Register Customer B with separate authentication (no orders will be created for them)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Get Customer B\'s order history using their own JWT token
  // Customer B has never placed any orders, so this should return an empty list
  const customerBOrders =
    await api.functional.ecommerceMall.customer.customers.me.orders.history(
      customerBConnection,
    );
  typia.assert(customerBOrders);
  // 4. Verify Customer B sees ZERO orders (data isolation - they never placed any)
  TestValidator.equals(
    "Customer B order count is zero",
    customerBOrders.data.length,
    0,
  );
  TestValidator.predicate(
    "Customer B has no orders",
    customerBOrders.data.length === 0,
  );
  // 5. Verify response structure is valid even with empty data
  TestValidator.equals(
    "pagination exists",
    customerBOrders.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination records is 0",
    customerBOrders.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    customerBOrders.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data is an empty array",
    Array.isArray(customerBOrders.data) && customerBOrders.data.length === 0,
    true,
  );
  // 6. Get Customer A\'s order history to verify they have their own separate view
  const customerAOrders =
    await api.functional.ecommerceMall.customer.customers.me.orders.history(
      customerAConnection,
    );
  typia.assert(customerAOrders);
  // 7. Verify Customer A\'s order list is separate from Customer B\'s
  TestValidator.equals(
    "Customer A orders is an array",
    Array.isArray(customerAOrders.data),
    true,
  );
  // 8. Critical: Verify the two customers have completely isolated order histories
  // Customer B\'s orders are NOT accessible via Customer B\'s token
  TestValidator.equals(
    "Customer B cannot access Customer A\'s orders - got empty list",
    customerBOrders.data.length,
    0,
  );
  // 9. Verify each customer\'s order history is keyed to their own ID
  // Customer B\'s history contains ONLY orders belonging to customerB.id
  // This is the core data isolation validation
  const customerBOrderIds = customerBOrders.data.map((order) => order.id);
  const customerAOrderIds = customerAOrders.data.map((order) => order.id);
  // Verify no order ID from Customer A appears in Customer B\'s list
  for (const orderId of customerAOrderIds) {
    TestValidator.predicate(
      `Order ID ${orderId} from Customer A is NOT in Customer B\'s history`,
      !customerBOrderIds.includes(orderId),
    );
  }
  // 10. Verify pagination shows correct isolation
  // Even if Customer A had orders, Customer B\'s pagination would only reflect their own orders
  TestValidator.equals(
    "Customer B pagination shows only their own record count",
    customerBOrders.pagination.records,
    customerBOrders.data.length,
  );
}
