import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
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
import type { IPageIEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSellerSnapshot";
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
 * Test that a customer can successfully retrieve seller profile snapshots for an order they placed.
 *
 * Prerequisites: Admin creates category, seller creates product and variant, customer authenticates,
 * adds item to cart, and completes checkout to create order with attached seller profile snapshots.
 * Then customer queries snapshots using orderId and itemId path parameters with pagination and date filtering.
 */
export async function test_api_customer_order_item_seller_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller setup - register and create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: typia.random<number & tags.Minimum<1000>>() satisfies number as number,
          stock: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Customer setup - register, login, add to cart, checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
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
        streetAddress: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        city: RandomGenerator.alphabets(5),
        state: RandomGenerator.alphabets(5),
        postalCode: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}`,
        country: "USA",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Get orderId and itemId from the created order
  const orderId = order.id;
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  const itemId = (orderItem as IEntity).id;
  // 5. Retrieve seller profile snapshots
  const requestParams: IEcommerceMallOrderItemSellerSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "createdAt_desc",
  } satisfies IEcommerceMallOrderItemSellerSnapshot.IRequest;
  const snapshotsPage =
    await api.functional.ecommerceMall.customer.orders.items.seller.snapshots.index(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: requestParams,
      },
    );
  typia.assert(snapshotsPage);
  // 6. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    snapshotsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    snapshotsPage.data !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(snapshotsPage.data));
  // 7. Validate pagination info
  TestValidator.predicate(
    "current page is valid",
    typeof snapshotsPage.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is valid",
    typeof snapshotsPage.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records count is valid",
    typeof snapshotsPage.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages count is valid",
    typeof snapshotsPage.pagination.pages === "number",
  );
  // 8. Validate snapshot records if any exist
  if (snapshotsPage.data.length > 0) {
    const snapshot = snapshotsPage.data[0];
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has shopName",
      typeof snapshot.shopName === "string",
    );
    TestValidator.predicate(
      "snapshot has logoUrl",
      snapshot.logoUrl === null || typeof snapshot.logoUrl === "string",
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      typeof snapshot.createdAt === "string",
    );
  }
  // 9. Test with date range filtering
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const filteredSnapshotsPage =
    await api.functional.ecommerceMall.customer.orders.items.seller.snapshots.index(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: {
          page: 1,
          limit: 10,
          sort: "createdAt_desc",
          fromDate: oneDayAgo,
          toDate: now,
        } satisfies IEcommerceMallOrderItemSellerSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshotsPage);
  TestValidator.predicate(
    "filtered page returned",
    filteredSnapshotsPage !== null,
  );
  // 10. Test pagination with different page sizes
  const smallPageSize =
    await api.functional.ecommerceMall.customer.orders.items.seller.snapshots.index(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: {
          page: 1,
          limit: 1,
          sort: "createdAt_asc",
        } satisfies IEcommerceMallOrderItemSellerSnapshot.IRequest,
      },
    );
  typia.assert(smallPageSize);
  TestValidator.equals(
    "limit matches requested",
    smallPageSize.pagination.limit,
    1,
  );
}