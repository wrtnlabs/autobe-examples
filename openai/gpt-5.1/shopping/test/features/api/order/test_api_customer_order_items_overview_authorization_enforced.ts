import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItemsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverview";
import type { IShoppingMallOrderItemsOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverviewItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_customer_order_items_overview_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Prepare common helper values
  const baseHref = "https://customer.example.com/join" as const;
  const baseReferrer = "https://customer.example.com/landing" as const;

  // 2. Join platform admin and log in (single step join is enough to get token)
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 3. As platform admin, create a category tree (even if not strictly needed for order items, it
  //    simulates realistic catalog setup dependencies in many domains)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: "Tree for itemsOverview auth test",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 4. As platform admin, create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "Brand for itemsOverview auth test",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create a product under some seller context
  //    We don't control seller identity here (it is implicit in platform admin context for this API),
  //    but IShoppingMallProduct.ICreate requires a seller id and optional brand id.
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1>,
    name: `Test Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: "Short description for auth test product",
    description: "Longer description for auth test product",
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 6. Create a SKU under the product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU for ${product.code}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 7. Customer A joins and gets authenticated
  const customerAEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(10)}@customer-a.example.com`;
  const customerAJoinBody = {
    email: customerAEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerA);

  // 8. Customer A creates a customer cart
  const customerACartBody = {
    currency_code: sku.currency,
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const customerACart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: customerACartBody },
    );
  typia.assert(customerACart);

  // 9. Customer A adds the SKU as a cart item
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Item for itemsOverview test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const customerACartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerACart.id,
        body: cartItemBody,
      },
    );
  typia.assert(customerACartItem);

  // 10. Customer A creates an order from the cart. For the required address ids, we use
  //     deterministic UUID-shaped values as placeholders: the backend in a real system
  //     would validate them, but here we focus on the itemsOverview ownership semantics.
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: customerACart.id,
    currency_code: customerACart.currency_code,
    items_subtotal_amount: customerACart.subtotal_amount,
    discount_total_amount: customerACart.discount_amount,
    shipping_total_amount: customerACart.shipping_amount,
    tax_total_amount: customerACart.tax_amount,
    grand_total_amount: customerACart.total_amount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Order for itemsOverview auth test",
  } satisfies IShoppingMallOrder.ICreate;
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(orderA);

  // 11. As customer A (current connection), call itemsOverview and validate content
  const overviewForOwner: IShoppingMallOrderItemsOverview =
    await api.functional.shoppingMall.customer.orders.itemsOverview.at(
      connection,
      {
        orderId: orderA.id,
      },
    );
  typia.assert(overviewForOwner);

  TestValidator.equals(
    "itemsOverview orderId should match created order id for owner",
    overviewForOwner.orderId,
    orderA.id,
  );
  TestValidator.predicate(
    "itemsOverview for owner should have at least one item",
    overviewForOwner.items.length > 0,
  );

  // 12. Customer B joins and becomes authenticated on the same connection via SDK
  const customerBEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(10)}@customer-b.example.com`;
  const customerBJoinBody = {
    email: customerBEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerB);

  // 13. As customer B, calling itemsOverview for customer A's order must fail due to authorization
  await TestValidator.error(
    "non-owner customer must not access another customer's itemsOverview",
    async () => {
      await api.functional.shoppingMall.customer.orders.itemsOverview.at(
        connection,
        {
          orderId: orderA.id,
        },
      );
    },
  );

  // 14. Prepare an unauthenticated connection by shallow-cloning connection with empty headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 15. Calling itemsOverview without any Authorization header should also fail
  await TestValidator.error(
    "unauthenticated caller must not access itemsOverview",
    async () => {
      await api.functional.shoppingMall.customer.orders.itemsOverview.at(
        unauthenticatedConnection,
        {
          orderId: orderA.id,
        },
      );
    },
  );
}
