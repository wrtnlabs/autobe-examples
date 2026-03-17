import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
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
import type { IPageIEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemProductSnapshot";
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

export async function test_api_product_snapshot_customer_views_own_order_item(
  connection: api.IConnection,
): Promise<void> {
  // Connect all actors
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // Setup admin and create category
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Setup seller and create product with variant
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
              ] as const),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ] as IEcommerceMallProductVariantOption.ICreate[],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >() satisfies number as number,
          stock: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >() satisfies number as number,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Setup customer
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Add variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Create order via checkout
  const checkoutOrder =
    await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: null,
          postalCode: RandomGenerator.alphaNumeric(5),
          country: "USA",
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(checkoutOrder);
  // Get orderId and itemId from the created order
  const orderId = checkoutOrder.id;
  const itemId = typia.assert<IEcommerceMallOrderItem & IEntity>(checkoutOrder.orderItems[0]).id;
  // Query product snapshots
  const snapshots =
    await api.functional.ecommerceMall.customer.orders.items.product.snapshots.index(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: {
          search: null,
          page: null,
          limit: null,
          createdAtFrom: null,
          createdAtTo: null,
        } satisfies IEcommerceMallOrderItemProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate response structure
  TestValidator.predicate(
    "snapshots has pagination",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "snapshots has data array",
    Array.isArray(snapshots.data),
  );
  TestValidator.predicate("data is not empty", snapshots.data.length > 0);
  // Validate snapshot content
  const snapshot = snapshots.data[0];
  TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
  TestValidator.predicate("snapshot has name", snapshot.name !== undefined);
  TestValidator.predicate(
    "snapshot has basePrice",
    snapshot.basePrice !== undefined,
  );
  TestValidator.predicate(
    "snapshot has createdAt",
    snapshot.createdAt !== undefined,
  );
  // Log results for debug
  console.log("Product Snapshot Retrieved Successfully");
  console.log(`- Order ID: ${orderId}`);
  console.log(`- Item ID: ${itemId}`);
  console.log(`- Snapshot Name: ${snapshot.name}`);
  console.log(`- Snapshot Base Price: ${snapshot.basePrice}`);
}