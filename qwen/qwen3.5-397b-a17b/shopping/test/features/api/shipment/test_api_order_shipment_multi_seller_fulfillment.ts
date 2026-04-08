import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test multi-seller order shipment fulfillment and query workflow.
 *
 * Validates the complete multi-seller fulfillment flow including administrative category setup, two seller product creation with variants, member customer order placement with items from both sellers, and shipment querying. Ensures that the order correctly contains items from multiple sellers and that the shipment query returns proper structure for multi-seller orders.
 *
 * Special attention is given to verifying that the order contains items from different sellers, establishing the foundation for multi-seller shipment separation. The shipment query endpoint is tested to ensure it correctly returns shipment data for orders with multiple sellers.
 *
 * 1. Administrator creates a category for product organization.
 * 2. First seller creates a product with a variant.
 * 3. Second seller creates a product with a variant.
 * 4. Member customer creates a shipping address for checkout.
 * 5. Member adds first seller's variant to cart.
 * 6. Member adds second seller's variant to cart.
 * 7. Member places order converting cart items to order items from multiple sellers.
 * 8. Member queries shipments for the order (validates endpoint functionality).
 * 9. Validates order contains items from both sellers, shipment query returns proper structure.
 */
export async function test_api_order_shipment_multi_seller_fulfillment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. First seller creates product with variant
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1Auth);
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product1);
  const variant1 = await generate_random_shopping_mall_seller_variants_create(
    seller1Connection,
    {
      body: {
        shopping_mall_product_id: product1.id,
      },
    },
  );
  typia.assert(variant1);
  // 3. Second seller creates product with variant
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Auth);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product2);
  const variant2 = await generate_random_shopping_mall_seller_variants_create(
    seller2Connection,
    {
      body: {
        shopping_mall_product_id: product2.id,
      },
    },
  );
  typia.assert(variant2);
  // 4. Member customer setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {},
  );
  typia.assert(address);
  // 5. Member adds first seller's variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  // 6. Member adds second seller's variant to cart
  const cartItem2 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // 7. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Validate order contains items from both sellers
  TestValidator.predicate(
    "order has items",
    () => order.orderItems.length >= 2,
  );
  // Extract unique seller IDs from order items
  const sellerIds = new Set(order.orderItems.map((item) => item.seller.id));
  TestValidator.predicate(
    "multiple sellers in order",
    () => sellerIds.size >= 2,
  );
  // 8. Query shipments for the order
  const shipments =
    await api.functional.shoppingMall.member.orders.shipments.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(shipments);
  // 9. Validate shipment query response structure
  TestValidator.predicate("pagination valid", () => {
    return (
      shipments.pagination.current >= 1 &&
      shipments.pagination.limit > 0 &&
      shipments.pagination.records >= 0 &&
      shipments.pagination.pages >= 0
    );
  });
  TestValidator.predicate("data is array", () => Array.isArray(shipments.data));
  // Validate each shipment has required fields
  for (const shipment of shipments.data) {
    TestValidator.predicate(
      "shipment has id",
      () => typeof shipment.id === "string",
    );
    TestValidator.predicate(
      "shipment has carrier_name",
      () => typeof shipment.carrier_name === "string",
    );
    TestValidator.predicate(
      "shipment has tracking_number",
      () => typeof shipment.tracking_number === "string",
    );
    TestValidator.predicate(
      "shipment has shipped_at",
      () => typeof shipment.shipped_at === "string",
    );
    TestValidator.predicate(
      "shipment has order",
      () => shipment.order !== undefined,
    );
    TestValidator.predicate(
      "shipment has seller",
      () => shipment.seller !== undefined,
    );
    TestValidator.predicate(
      "shipment has order_items_count",
      () => typeof shipment.order_items_count === "number",
    );
  }
}
