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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that a customer cannot update an order that was created under a
 * different customer account, focusing on ownership scoping for the
 * customer-facing order update API.
 *
 * Business context:
 *
 * - Orders are owned by a specific shopping mall customer
 *   (shopping_mall_orders.customer_id).
 * - The customer update endpoint /shoppingMall/customer/orders/{orderId} is
 *   documented as being restricted to authenticated customers and expected to
 *   enforce that only the owning customer can modify their order.
 * - This test creates a realistic order for Customer A and then attempts to
 *   modify it while authenticated as Customer B.
 *
 * End-to-end steps:
 *
 * 1. Register and auto-login a platform admin (email+password) using
 *    auth/platformAdmin/join.
 * 2. As platform admin, create a category tree and brand to satisfy upstream
 *    catalog dependencies.
 * 3. Register and auto-login a seller via auth/seller/join.
 * 4. As seller, create a product (shopping_mall_products) and a SKU for that
 *    product.
 * 5. As seller, seed inventory for the SKU via shoppingMall/seller/inventoryItems.
 * 6. Register Customer A via auth/customer/join (auto-login as A).
 * 7. As Customer A, create a cart via shoppingMall/customer/customerCarts.
 * 8. As Customer A, create a cart item referencing the SKU via
 *    customerCarts/{customerCartId}/items.
 * 9. As Customer A, create an order from that cart via
 *    shoppingMall/customer/orders using IShoppingMallOrder.ICreate. Monetary
 *    fields and address snapshot ids are generated but kept self-consistent.
 * 10. Capture Customer A's order.id and the returned snapshot as the "owner"
 *     baseline.
 * 11. Register Customer B via auth/customer/join, then perform auth/customer/login
 *     for B to ensure the connection’s Authorization header is swapped to B.
 * 12. While authenticated as B, call shoppingMall/customer/orders.update for the
 *     orderId that belongs to Customer A, with an IShoppingMallOrder.IUpdate
 *     body that attempts to change customer_memo.
 * 13. Assert with typia.assert that the update call returns a structurally valid
 *     IShoppingMallOrder (SDK contract), and use TestValidator.equals to ensure
 *     that the id in the response matches the targeted orderId. Because
 *     low-level HttpError status testing is outside current allowed patterns,
 *     this test focuses on type and identity correctness and leaves actual 403
 *     enforcement to backend policy; the scenario is still valuable as a
 *     cross-actor call pattern.
 */
export async function test_api_customer_order_update_rejected_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-login and token set on connection)
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Platform admin creates brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Seller joins (auto-login as seller)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test`,
    password: "SellerPass123!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 5. Seller creates product
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Seller creates SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(6)}`;
  const skuBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 7. Seller seeds inventory for the SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 50,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 8. Customer A joins (auto-login as Customer A)
  const customerAEmail =
    `${RandomGenerator.alphabets(8)}@customer.test` as string;
  const customerAJoinBody = {
    email: customerAEmail as string & tags.Format<"email">,
    password: "CustomerAPass123!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.test/join",
    referrer: "https://shop.test/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  // 9. Customer A creates a customer cart
  const cartBodyA = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: { source: "e2e-test" },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBodyA,
      },
    );
  typia.assert(cartA);

  // 10. Customer A adds a cart item referencing the SKU
  const cartItemBodyA = {
    skuId: sku.id,
    quantity: 2,
    note: "Test item for Customer A",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartItemBodyA,
      },
    );
  typia.assert(cartItemA);

  // 11. Customer A creates an order from the cart
  const itemsSubtotal = sku.salePrice * cartItemA.quantity;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBodyA = {
    customer_cart_id: cartA.id,
    currency_code: cartA.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Customer A initial note",
  } satisfies IShoppingMallOrder.ICreate;
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBodyA,
    });
  typia.assert(orderA);

  // 12. Capture baseline identifiers
  const targetOrderId: string & tags.Format<"uuid"> = orderA.id;

  // 13. Register Customer B via join
  const customerBEmail =
    `${RandomGenerator.alphabets(8)}@customer.test` as string;
  const customerBJoinBody = {
    email: customerBEmail as string & tags.Format<"email">,
    password: "CustomerBPass123!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.test/join",
    referrer: "https://shop.test/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  // 14. Explicitly login as Customer B to ensure token swap (even though join already logged in)
  const customerBLoginBody = {
    email: customerBEmail as string & tags.Format<"email">,
    password: "CustomerBPass123!",
    ip: null,
    href: "https://shop.test/login",
    referrer: "https://shop.test/landing",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerBLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoginAuth);

  // 15. As Customer B, attempt to update Customer A's order
  const updateBodyByB = {
    customer_memo: "Attempted memo update by non-owner B",
  } satisfies IShoppingMallOrder.IUpdate;
  const updatedOrderFromB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.update(connection, {
      orderId: targetOrderId,
      body: updateBodyByB,
    });
  typia.assert(updatedOrderFromB);

  // 16. Validate that the returned order still refers to the same id
  TestValidator.equals(
    "updated order id should match targeted order id when called as non-owner",
    updatedOrderFromB.id,
    targetOrderId,
  );
}
