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
 * Test that a seller can view all pending cancellation requests for their order items.
 *
 * Validates the complete cancellation request listing flow for sellers, including seller and customer authentication, product creation with variants, order placement, and cancellation request creation. Ensures that sellers can correctly view pending cancellation requests with all relevant customer and order item information.
 *
 * Special attention is given to verifying that the response contains accurate customer details, order item information, and that the response_reason field is null for pending requests. The test also validates pagination metadata and sorting order.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Customer registers and authenticates with the platform.
 * 3. Seller creates a product with a name, description, and base price.
 * 4. Seller creates a product variant with SKU code, options, and initial stock.
 * 5. Customer adds the product variant to their shopping cart.
 * 6. Customer completes checkout to create an order with the item in 'paid' status.
 * 7. Customer creates a cancellation request for the order item with a reason.
 * 8. Seller calls the cancellation requests listing endpoint with status filter 'pending'.
 * 9. Validates that the response contains exactly one cancellation request.
 * 10. Validates that the cancellation request has correct status, customer info, order item details, and null response_reason.
 */
export async function test_api_cancellation_request_seller_pending_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
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
  // 4. Seller creates a product variant with inventory
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          variantOptions: [
            {
              key: "color",
              value: "Red",
            },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer completes checkout (requires shipping address)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Validate that order has at least one item
  TestValidator.predicate("order has items", order.items.length > 0);
  // 7. Customer creates a cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 8. Seller calls the cancellation requests listing endpoint with status filter 'pending'
  const listingResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(listingResponse);
  // 9. Validate that the response contains exactly one cancellation request
  TestValidator.equals(
    "cancellation request count",
    listingResponse.data.length,
    1,
  );
  // 10. Validate the cancellation request details
  const retrievedRequest = listingResponse.data[0];
  // Status should be 'pending'
  TestValidator.equals(
    "cancellation request status",
    retrievedRequest.status,
    "pending",
  );
  // Customer information should match
  TestValidator.equals(
    "customer email",
    retrievedRequest.customer.email,
    customerEmail,
  );
  TestValidator.predicate(
    "customer display name exists",
    retrievedRequest.customer.display_name.length > 0,
  );
  // Order item details should be present
  TestValidator.predicate(
    "order item has quantity",
    retrievedRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has price",
    retrievedRequest.orderItem.price > 0,
  );
  TestValidator.equals(
    "order item status",
    retrievedRequest.orderItem.status,
    "paid",
  );
  // Cancellation reason should be present
  TestValidator.predicate(
    "cancellation reason exists",
    retrievedRequest.reason.length >= 10,
  );
  // Response reason should be null for pending requests
  TestValidator.equals(
    "response reason is null",
    retrievedRequest.response_reason,
    null,
  );
  // Pagination metadata should be correct
  TestValidator.equals(
    "pagination current page",
    listingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    listingResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination total pages",
    listingResponse.pagination.pages,
    1,
  );
}
