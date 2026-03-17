import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import type { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_seller_order_item_snapshot_retrieval_full_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin and category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 2: Create seller and product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // Step 3: Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // Step 4: Create customer, add to cart, and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order has order items
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  const orderItem = typia.assert<IEntity & IEcommerceMallOrderItem>(order.orderItems[0]);
  // Step 5: Retrieve snapshots as seller
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.orders.items.snapshots.index(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {} satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Step 6: Validate response structure
  TestValidator.predicate(
    "response has pagination",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.predicate(
    "response has at least one snapshot",
    snapshotsResponse.data.length > 0,
  );
  // Validate pagination metadata
  const pagination = snapshotsResponse.pagination;
  TestValidator.predicate(
    "pagination has current page",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof pagination.pages === "number",
  );
  // Validate snapshot content
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // Validate product snapshot
  TestValidator.predicate(
    "product snapshot exists",
    snapshot.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "product snapshot has id",
    typeof snapshot.productSnapshot.id === "string",
  );
  TestValidator.predicate(
    "product snapshot has name",
    typeof snapshot.productSnapshot.name === "string",
  );
  TestValidator.predicate(
    "product snapshot has description",
    typeof snapshot.productSnapshot.description === "string",
  );
  TestValidator.predicate(
    "product snapshot has base price",
    typeof snapshot.productSnapshot.base_price === "number",
  );
  TestValidator.predicate(
    "product snapshot has created timestamp",
    typeof snapshot.productSnapshot.created_at === "string",
  );
  // Validate variant snapshot
  TestValidator.predicate(
    "variant snapshot exists",
    snapshot.variantSnapshot !== undefined,
  );
  TestValidator.predicate(
    "variant snapshot has id",
    typeof snapshot.variantSnapshot.id === "string",
  );
  TestValidator.predicate(
    "variant snapshot has sku code",
    typeof snapshot.variantSnapshot.skuCode === "string",
  );
  TestValidator.predicate(
    "variant snapshot has price",
    typeof snapshot.variantSnapshot.price === "number",
  );
  TestValidator.predicate(
    "variant snapshot has created timestamp",
    typeof snapshot.variantSnapshot.createdAt === "string",
  );
  TestValidator.predicate(
    "variant snapshot has attributes array",
    Array.isArray(snapshot.variantSnapshot.attributes),
  );
  // Validate seller snapshot
  TestValidator.predicate(
    "seller snapshot exists",
    snapshot.sellerSnapshot !== undefined,
  );
  TestValidator.predicate(
    "seller snapshot has id",
    typeof snapshot.sellerSnapshot.id === "string",
  );
  TestValidator.predicate(
    "seller snapshot has shop name",
    typeof snapshot.sellerSnapshot.shopName === "string",
  );
  TestValidator.predicate(
    "seller snapshot has created timestamp",
    typeof snapshot.sellerSnapshot.createdAt === "string",
  );
  // Validate snapshot timestamps
  TestValidator.predicate(
    "snapshot has created timestamp",
    typeof snapshot.createdAt === "string",
  );
  TestValidator.predicate(
    "snapshot has order item id",
    typeof snapshot.orderItemId === "string",
  );
  TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
}