import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller filtering of cancellation requests by status (approved, rejected, pending).
 *
 * Validates that sellers can filter cancellation requests by their current status, ensuring that only requests matching the specified status are returned. Tests the complete workflow including creating multiple cancellation requests, approving and rejecting them, and verifying that the status filter correctly returns only the matching requests.
 *
 * Special attention is given to verifying that response_reason is populated when a seller responds to a cancellation request, and that the filtering mechanism correctly separates pending, approved, and rejected requests.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Seller creates a product with variants and initial inventory.
 * 4. Customer adds product variant to cart and places an order.
 * 5. Customer creates multiple cancellation requests for different order items.
 * 6. Seller approves one cancellation request with a response reason.
 * 7. Seller rejects another cancellation request with a response reason.
 * 8. Seller filters cancellation requests by 'approved' status.
 * 9. Verify only approved requests are returned with response_reason populated.
 * 10. Seller filters cancellation requests by 'rejected' status.
 * 11. Verify only rejected requests are returned with response_reason populated.
 * 12. Seller retrieves all cancellation requests without status filter.
 * 13. Verify all requests (pending, approved, rejected) are returned.
 */
export async function test_api_cancellation_request_seller_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates two variants with inventory
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-001",
          variantOptions: [{ key: "color", value: "Red" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-002",
          variantOptions: [{ key: "color", value: "Blue" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant2);
  // 5. Customer adds both variants to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // 6. Customer places order (checkout)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: "test_payment_token",
      },
    },
  );
  typia.assert(order);
  // 7. Customer creates first cancellation request
  const cancellationRequest1 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: "Changed my mind about this item",
        },
      },
    );
  typia.assert(cancellationRequest1);
  // 8. Customer creates second cancellation request
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[1].id,
          reason: "Found a better price elsewhere",
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 9. Customer creates third cancellation request (will remain pending)
  const cancellationRequest3 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: "Third cancellation request for testing",
        },
      },
    );
  typia.assert(cancellationRequest3);
  // 10. Seller approves first cancellation request
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          status: "approved",
          response_reason: "Approved due to customer request",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 11. Seller rejects second cancellation request
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          status: "rejected",
          response_reason: "Item already being prepared for shipment",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 12. Test filtering by 'approved' status
  const approvedFilterResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedFilterResult);
  TestValidator.equals(
    "approved filter returns only approved requests",
    approvedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "approved request has correct status",
    approvedFilterResult.data[0].status,
    "approved",
  );
  TestValidator.predicate(
    "approved request has response_reason",
    approvedFilterResult.data[0].response_reason !== null,
  );
  // 13. Test filtering by 'rejected' status
  const rejectedFilterResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedFilterResult);
  TestValidator.equals(
    "rejected filter returns only rejected requests",
    rejectedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "rejected request has correct status",
    rejectedFilterResult.data[0].status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected request has response_reason",
    rejectedFilterResult.data[0].response_reason !== null,
  );
  // 14. Test filtering by 'pending' status
  const pendingFilterResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.equals(
    "pending filter returns only pending requests",
    pendingFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "pending request has correct status",
    pendingFilterResult.data[0].status,
    "pending",
  );
  TestValidator.equals(
    "pending request has null response_reason",
    pendingFilterResult.data[0].response_reason,
    null,
  );
  // 15. Test without status filter (all requests)
  const allFilterResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allFilterResult);
  TestValidator.equals(
    "no filter returns all requests",
    allFilterResult.data.length,
    3,
  );
  const statuses = allFilterResult.data.map((req) => req.status);
  TestValidator.predicate(
    "all statuses are present",
    statuses.includes("approved") &&
      statuses.includes("rejected") &&
      statuses.includes("pending"),
  );
}
