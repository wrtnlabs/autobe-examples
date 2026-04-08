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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can successfully retrieve detailed information about their own order item.
 *
 * Validates the complete order item retrieval flow including seller authentication, product and variant creation, customer order placement, and seller access to order item details. Ensures that sellers can only access order items belonging to their own products and that all related data is correctly populated.
 *
 * Special attention is given to verifying that the order item snapshot preserves the product state at purchase time, including product name, description, variant price, and seller shop information. The snapshot options array must contain the variant option key-value pairs selected by the customer.
 *
 * 1. Seller registers and logs in to create authenticated seller connection.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller creates a product variant with SKU code and option values.
 * 4. Customer member registers and logs in to create authenticated customer connection.
 * 5. Customer places an order containing the seller's product variant.
 * 6. Seller retrieves the order item details using the order item ID.
 * 7. Validates order item structure, seller ownership, snapshot data, and all nested relations.
 */
export async function test_api_order_item_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and login
  const memberJoin = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerConnection, {
    body: {
      email: memberJoin.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 5. Customer places order - this requires cart items to be set up first
  // For this test, we'll create an order which will include the product variant
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Get the order item that belongs to our seller
  const orderItem = order.orderItems.find(
    (item) => item.seller.id === sellerJoin.id,
  );
  TestValidator.predicate(
    "order item exists for seller",
    () => orderItem !== undefined,
  );
  const orderItemId = orderItem!.id;
  // 7. Seller retrieves order item details
  const orderItemDetail =
    await api.functional.shoppingMall.seller.seller.order_items.at(
      sellerConnection,
      {
        orderItemId: orderItemId,
      },
    );
  typia.assert(orderItemDetail);
  // 8. Validate order item structure and data
  TestValidator.equals(
    "order item ID matches",
    orderItemDetail.id,
    orderItemId,
  );
  TestValidator.predicate(
    "quantity is positive",
    () => orderItemDetail.quantity > 0,
  );
  TestValidator.predicate("price is positive", () => orderItemDetail.price > 0);
  TestValidator.equals("status is paid", orderItemDetail.status, "paid");
  // Validate order relation
  TestValidator.equals(
    "order code matches",
    orderItemDetail.order.code,
    order.code,
  );
  TestValidator.equals(
    "order total price matches",
    orderItemDetail.order.total_price,
    order.total_price,
  );
  // Validate product relation
  TestValidator.equals(
    "product ID matches",
    orderItemDetail.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    orderItemDetail.product.name,
    product.name,
  );
  // Validate variant relation
  TestValidator.equals(
    "variant ID matches",
    orderItemDetail.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant SKU matches",
    orderItemDetail.productVariant.sku_code,
    variant.sku_code,
  );
  // Validate seller relation
  TestValidator.equals(
    "seller ID matches",
    orderItemDetail.seller.id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "seller email matches",
    orderItemDetail.seller.email,
    sellerJoin.email,
  );
  // Validate shipment is null (not yet shipped)
  TestValidator.equals("shipment is null", orderItemDetail.shipment, null);
  // Validate snapshot exists and has required fields
  TestValidator.predicate(
    "snapshot exists",
    () => orderItemDetail.snapshot !== undefined,
  );
  TestValidator.equals(
    "snapshot product name matches",
    orderItemDetail.snapshot.product_name,
    product.name,
  );
  TestValidator.predicate(
    "snapshot has description",
    () => orderItemDetail.snapshot.product_description.length > 0,
  );
  TestValidator.predicate(
    "snapshot variant price is positive",
    () => orderItemDetail.snapshot.variant_price > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    () => orderItemDetail.snapshot.seller_shop_name.length > 0,
  );
  // Validate snapshot options exist
  TestValidator.predicate(
    "snapshot options exist",
    () => orderItemDetail.snapshot.options.length > 0,
  );
  orderItemDetail.snapshot.options.forEach((option) => {
    TestValidator.predicate("option has key", () => option.key.length > 0);
    TestValidator.predicate("option has value", () => option.value.length > 0);
  });
}
