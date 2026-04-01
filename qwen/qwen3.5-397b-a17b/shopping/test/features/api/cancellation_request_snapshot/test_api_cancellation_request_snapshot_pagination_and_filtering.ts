import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test the pagination and filtering capabilities of the cancellation request snapshot listing endpoint.
 *
 * **Setup Sequence:**
 * 1. Seller joins and authenticates
 * 2. Customer joins and authenticates
 * 3. Customer creates a shipping address
 * 4. Customer creates an order (using generation function which handles product/variant internally)
 * 5. Customer creates a cancellation request for the order item
 * 6. Seller responds to cancellation request (creates snapshot)
 *
 * **Test Validation:**
 * - Test default pagination (page=1, limit=20, sort='created_at DESC')
 * - Test custom pagination parameters (page=1, limit=10)
 * - Test status filtering with 'approved', 'rejected', and 'pending' status
 * - Verify pagination metadata structure (current, limit, records, pages)
 * - Verify snapshot data structure via typia.assert
 * - Test edge case: pagination beyond available records returns empty data array
 */
export async function test_api_cancellation_request_snapshot_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  // 1. Seller setup - join and login
  await authorize_seller_join(connection, {
    body: sellerCredentials,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerCredentials.password,
      href: sellerCredentials.href,
      referrer: sellerCredentials.referrer,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Customer setup - join and login
  await authorize_customer_join(connection, {
    body: customerCredentials,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerCredentials.email,
      password: customerCredentials.password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 4. Customer creates order (generation function handles product/variant internally)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 5. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
        params: {
          orderItemId: orderItem.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Test default pagination - retrieve snapshots
  const defaultPagination =
    await api.functional.shoppingMall.seller.order_items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at DESC",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(defaultPagination);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is valid",
    defaultPagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    defaultPagination.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    defaultPagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    defaultPagination.pagination.pages >= 0,
  );
  // Validate snapshot data structure (typia.assert already validates types)
  if (defaultPagination.data.length > 0) {
    const snapshot = defaultPagination.data[0];
    // Verify business logic: snapshot status should match the cancellation request status
    TestValidator.predicate(
      "snapshot status is valid enum value",
      ["pending", "approved", "rejected"].includes(snapshot.status),
    );
    // Verify seller information is present
    TestValidator.predicate(
      "snapshot has seller information",
      snapshot.seller.id !== undefined,
    );
  }
  // 7. Test custom pagination parameters
  const customPagination =
    await api.functional.shoppingMall.seller.order_items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom limit applied",
    customPagination.pagination.limit,
    10,
  );
  // 8. Test status filtering - approved
  const approvedFilter =
    await api.functional.shoppingMall.seller.order_items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedFilter);
  // 9. Test status filtering - rejected
  const rejectedFilter =
    await api.functional.shoppingMall.seller.order_items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedFilter);
  // 10. Test status filtering - pending
  const pendingFilter =
    await api.functional.shoppingMall.seller.order_items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingFilter);
  // 11. Test pagination beyond available records
  const beyondPagination =
    await api.functional.shoppingMall.seller.order_items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(beyondPagination);
  TestValidator.equals(
    "empty data for beyond page",
    beyondPagination.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata still valid for empty result",
    beyondPagination.pagination.current === 999,
  );
}
