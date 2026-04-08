import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can successfully retrieve a pending cancellation request for an order item belonging to their product.
 *
 * Validates the complete cancellation request retrieval flow including seller and customer authentication, product creation, order placement, cancellation request submission, and seller access to the cancellation request details. Ensures that the seller can view pending cancellation requests for their products with all necessary context for making approval/rejection decisions.
 *
 * Special attention is given to verifying that the cancellation request status is 'pending', respondedAt is null, and all order item and customer information is correctly included in the response.
 *
 * 1. Seller registers and creates a product with variant.
 * 2. Customer registers and creates an order containing the seller's product variant.
 * 3. Customer creates a cancellation request for the order item with a reason.
 * 4. Seller retrieves the cancellation request by ID.
 * 5. Validates cancellation request details match the submitted data and business rules.
 */
export async function test_api_seller_cancellation_request_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. Customer setup - register and create order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerAuth);
  // Note: Order creation requires cart items to exist first
  // For this test, we assume the cart has been populated with the variant
  // The order will be created from cart items automatically
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // Get the order item for the seller's product
  const orderItem = order.orderItems.find(
    (item) => item.productVariant.id === variant.id,
  );
  if (!orderItem) {
    throw new Error("Order item for seller's variant not found");
  }
  // 3. Customer creates cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Seller retrieves the cancellation request
  const retrievedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedCancellationRequest);
  // 5. Validate cancellation request details
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedCancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation reason matches",
    retrievedCancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "status is pending",
    retrievedCancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "respondedAt is null",
    retrievedCancellationRequest.respondedAt,
    null,
  );
  TestValidator.equals(
    "deletedAt is null",
    retrievedCancellationRequest.deletedAt,
    null,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedCancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedCancellationRequest.orderItem.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedCancellationRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.predicate(
    "createdAt timestamp exists",
    () =>
      retrievedCancellationRequest.createdAt !== null &&
      retrievedCancellationRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    () =>
      retrievedCancellationRequest.updatedAt !== null &&
      retrievedCancellationRequest.updatedAt !== undefined,
  );
}
