import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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

/**
 * Test customer variant snapshot retrieval success path.
 *
 * A customer places an order and later retrieves variant snapshots to verify
 * the exact state of the purchased variant at the time of purchase.
 *
 * Test steps:
 * 1. Authenticate as admin and create a category
 * 2. Authenticate as seller, create a product in that category, then create a variant
 *    with SKU "PROD-001", options [{"Color": "Red"}, {"Size": "Large"}], price $100, and initial stock 50
 * 3. Authenticate as customer, add the variant to cart with quantity 2
 * 4. Proceed to checkout with complete shipping address
 * 5. Retrieve variant snapshots for the order item via target endpoint
 * 6. Validate snapshot content and structure
 */
export async function test_api_customer_variant_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin: Create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller: Create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: "Test Product",
        description: "A product for testing variant snapshots",
        basePrice: 100,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "PROD-001",
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: 100,
          stock: 50,
        },
      },
    );
  typia.assert(variant);
  TestValidator.equals("variant SKU", variant.skuCode, "PROD-001");
  TestValidator.equals("variant price", variant.price, 100);
  // 3. Customer: Add to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  TestValidator.equals("cart quantity", cartItem.quantity, 2);
  // 4. Checkout with complete shipping address
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "John Doe",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "10001",
        country: "Korea",
      },
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get orderId and itemId - cast to ISummary to access id property
  const orderId = order.id;
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem.ISummary;
  const itemId = orderItem.id;
  // 5. Retrieve variant snapshots
  const snapshotRequest: IEcommerceMallProductVariantSnapshot.IRequest = {
    page: 1,
    limit: 10,
  };
  const snapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.variant.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot structure and content
  TestValidator.predicate("snapshots have pagination", !!snapshots.pagination);
  TestValidator.predicate(
    "snapshots data is array",
    Array.isArray(snapshots.data),
  );
  TestValidator.predicate(
    "snapshots contain at least one snapshot",
    snapshots.data.length >= 1,
  );
  // Validate first snapshot content
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.predicate("snapshot has id", !!firstSnapshot.id);
  TestValidator.predicate("snapshot has variantId", !!firstSnapshot.variantId);
  TestValidator.equals("snapshot SKU", firstSnapshot.skuCode, "PROD-001");
  TestValidator.equals("snapshot price", firstSnapshot.price, 100);
  TestValidator.predicate(
    "snapshot has optionValues",
    typeof firstSnapshot.optionValues === "object",
  );
  TestValidator.equals(
    "snapshot Color option",
    firstSnapshot.optionValues["Color"],
    "Red",
  );
  TestValidator.equals(
    "snapshot Size option",
    firstSnapshot.optionValues["Size"],
    "Large",
  );
  TestValidator.predicate("snapshot has createdAt", !!firstSnapshot.createdAt);
  // Validate pagination info
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshots.pagination.pages >= 1,
  );
}
