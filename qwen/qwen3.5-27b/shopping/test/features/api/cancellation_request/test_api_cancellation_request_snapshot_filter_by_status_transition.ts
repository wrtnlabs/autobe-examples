import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can filter cancellation request snapshots by status transition.
 *
 * Validates the complete cancellation request workflow including product setup, order creation, cancellation requests, and snapshot filtering. Ensures that sellers can effectively filter their approval and rejection history for dispute resolution and audit purposes.
 *
 * The test creates two separate cancellation requests, approves one and rejects the other, then verifies that the snapshot filtering correctly returns only the relevant snapshots based on status transition criteria.
 *
 * 1. Register and authenticate a seller account
 * 2. Register and authenticate a customer account
 * 3. Create two products with variants and inventory (seller)
 * 4. Customer creates two separate orders, each with a different product variant
 * 5. Customer creates cancellation requests for both order items
 * 6. Seller approves the first cancellation request (creates snapshot with status_after='approved')
 * 7. Seller rejects the second cancellation request (creates snapshot with status_after='rejected')
 * 8. Seller filters snapshots by status_before='pending' and status_after='approved'
 * 9. Verify only the approved snapshot is returned (records=1)
 * 10. Seller filters snapshots by status_before='pending' and status_after='rejected'
 * 11. Verify only the rejected snapshot is returned (records=1)
 * 12. Verify each snapshot contains the correct seller_response
 */
export async function test_api_cancellation_request_snapshot_filter_by_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Create first product with variant (seller)
  const product1 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "First Product",
        description: "First product description",
        base_price: 10000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product1.id,
        body: {
          sku_code: "VAR001",
          price: null,
          variantOptions: [{ key: "color", value: "red" }],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 4. Create second product with variant (seller)
  const product2 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Second Product",
        description: "Second product description",
        base_price: 20000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product2.id,
        body: {
          sku_code: "VAR002",
          price: null,
          variantOptions: [{ key: "color", value: "blue" }],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 5. Customer creates first order (checkout handles cart internally)
  const order1 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: "test_payment_token_1",
      },
    },
  );
  typia.assert(order1);
  // 6. Customer creates second order
  const order2 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: "test_payment_token_2",
      },
    },
  );
  typia.assert(order2);
  // 7. Customer creates first cancellation request for order1 item
  const cancellationRequest1 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order1.items[0].id,
          reason: "I need to cancel this order due to change of plans",
        },
      },
    );
  typia.assert(cancellationRequest1);
  // 8. Customer creates second cancellation request for order2 item
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order2.items[0].id,
          reason: "I accidentally ordered the wrong item",
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 9. Seller approves first cancellation request
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          status: "approved",
          response_reason:
            "Approval: Customer requested cancellation before shipment",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 10. Seller rejects second cancellation request
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          status: "rejected",
          response_reason:
            "Rejection: Item is already being prepared for shipment",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 11. Seller filters snapshots by status_after='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          sellerId: sellerAuth.id,
          statusBefore: "pending",
          statusAfter: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 12. Verify only one approved snapshot is returned
  TestValidator.equals(
    "approved snapshot count",
    approvedSnapshots.pagination.records,
    1,
  );
  // 13. Verify the approved snapshot has correct status transition
  TestValidator.equals(
    "approved snapshot status_before",
    approvedSnapshots.data[0].status_before,
    "pending",
  );
  TestValidator.equals(
    "approved snapshot status_after",
    approvedSnapshots.data[0].status_after,
    "approved",
  );
  // 14. Verify the approved snapshot contains seller response
  TestValidator.predicate(
    "approved snapshot has seller response",
    approvedSnapshots.data[0].seller_response !== null,
  );
  // 15. Seller filters snapshots by status_after='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          sellerId: sellerAuth.id,
          statusBefore: "pending",
          statusAfter: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 16. Verify only one rejected snapshot is returned
  TestValidator.equals(
    "rejected snapshot count",
    rejectedSnapshots.pagination.records,
    1,
  );
  // 17. Verify the rejected snapshot has correct status transition
  TestValidator.equals(
    "rejected snapshot status_before",
    rejectedSnapshots.data[0].status_before,
    "pending",
  );
  TestValidator.equals(
    "rejected snapshot status_after",
    rejectedSnapshots.data[0].status_after,
    "rejected",
  );
  // 18. Verify the rejected snapshot contains seller response
  TestValidator.predicate(
    "rejected snapshot has seller response",
    rejectedSnapshots.data[0].seller_response !== null,
  );
}
