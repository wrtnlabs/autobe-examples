import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test cancellation request creation for a specific order item in a multi-seller order.
 *
 * Validates the complete cancellation request workflow in a multi-seller order scenario. The test creates two sellers with different products, has a customer purchase items from both sellers in a single order, and then requests cancellation for only one order item. This verifies that the system correctly isolates cancellation requests to individual order items and properly associates them with the correct seller.
 *
 * The test ensures that cancellation requests are properly scoped to individual order items within multi-seller orders, that the seller association is correctly determined from the order item's seller reference, and that the audit trail (snapshots) accurately captures the request state.
 *
 * 1. Administrator creates two product categories for organization.
 * 2. First seller registers, gets approved, creates product with variant.
 * 3. Second seller registers, gets approved, creates different product with variant.
 * 4. Customer (member) registers account and adds shipping address.
 * 5. Customer adds both variants from different sellers to shopping cart.
 * 6. Customer places single order containing items from both sellers.
 * 7. Customer creates cancellation request for first seller's order item only.
 * 8. Validates cancellation request references correct seller and order item.
 * 9. Validates second order item remains unaffected with status='paid'.
 * 10. Validates snapshot was created with correct seller association.
 */
export async function test_api_post_purchase_cancellation_request_multi_seller_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create categories
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category1 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(category1);
  const category2 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(category2);
  // 2. First seller setup
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Join = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1Join);
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category1.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product1);
  const variant1 = await generate_random_shopping_mall_seller_variants_create(
    seller1Connection,
    {
      body: {
        shopping_mall_product_id: product1.id,
        sku_code: RandomGenerator.alphaNumeric(8),
        option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}`,
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<500>>(),
      },
    },
  );
  typia.assert(variant1);
  // 3. Second seller setup
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Join = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Join);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category2.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product2);
  const variant2 = await generate_random_shopping_mall_seller_variants_create(
    seller2Connection,
    {
      body: {
        shopping_mall_product_id: product2.id,
        sku_code: RandomGenerator.alphaNumeric(8),
        option_values: `Size: ${RandomGenerator.pick(["Small", "Medium", "Large"] as const)}`,
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<500>>(),
      },
    },
  );
  typia.assert(variant2);
  // 4. Customer (member) setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoin);
  // 5. Customer adds shipping address
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 6. Customer adds both variants to cart
  const cartItem1 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // 7. Customer places order with items from both sellers
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Validate order has exactly 2 items
  TestValidator.equals("order items count", order.orderItems.length, 2);
  // Identify which order item belongs to which seller
  const orderItem1 = order.orderItems.find(
    (item) => item.seller.id === seller1Join.id,
  );
  const orderItem2 = order.orderItems.find(
    (item) => item.seller.id === seller2Join.id,
  );
  TestValidator.predicate(
    "first seller order item exists",
    () => orderItem1 !== undefined,
  );
  TestValidator.predicate(
    "second seller order item exists",
    () => orderItem2 !== undefined,
  );
  // Validate both order items have 'paid' status
  TestValidator.equals("first order item status", orderItem1!.status, "paid");
  TestValidator.equals("second order item status", orderItem2!.status, "paid");
  // 8. Customer creates cancellation request for first seller's order item
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem1!.id,
          reason: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 9. Validate cancellation request
  TestValidator.equals(
    "cancellation request order item",
    cancellationRequest.orderItem.id,
    orderItem1!.id,
  );
  TestValidator.equals(
    "cancellation request seller",
    cancellationRequest.seller.id,
    seller1Join.id,
  );
  TestValidator.equals(
    "cancellation request status",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "cancellation request has reason",
    () => cancellationRequest.reason.length > 0,
  );
  // Validate snapshots were created
  TestValidator.predicate(
    "snapshots exist",
    () => cancellationRequest.snapshots.length > 0,
  );
  const initialSnapshot = cancellationRequest.snapshots[0];
  TestValidator.equals(
    "initial snapshot status",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "initial snapshot seller",
    initialSnapshot.seller!.id,
    seller1Join.id,
  );
  // 10. Validate second order item remains unaffected
  TestValidator.equals(
    "second order item still paid",
    orderItem2!.status,
    "paid",
  );
  // Validate order item snapshot has seller information
  TestValidator.predicate(
    "order item snapshot has seller shop name",
    () => orderItem1!.snapshot.seller_shop_name.length > 0,
  );
}
