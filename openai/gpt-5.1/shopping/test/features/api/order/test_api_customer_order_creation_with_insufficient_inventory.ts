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
 * Validate master order creation when cart quantity exceeds configured
 * inventory.
 *
 * Business intent:
 *
 * - Ensure that the critical flow of creating an order from a customer cart works
 *   even when the cart requests more units than currently on-hand inventory for
 *   the referenced SKU.
 * - The test sets up a realistic multi-actor environment (platform admin, seller,
 *   customer), catalog product, SKU, and a constrained inventory item, then has
 *   the customer add an over-quantity cart item and create an order.
 *
 * Steps:
 *
 * 1. Platform admin joins and logs in (establishes admin actor; also used to
 *    exercise the auth APIs, though admin is not strictly needed for the
 *    minimal flow here).
 * 2. Platform admin creates a category tree and a brand (catalog scaffolding).
 * 3. Seller joins and logs in.
 * 4. Seller creates a product associated with the brand.
 * 5. Seller creates a SKU under the product.
 * 6. Seller creates an inventory item for the SKU with on_hand_quantity = 1 and
 *    backorder_enabled = false, preorder_enabled = false.
 * 7. Customer joins and logs in.
 * 8. Customer creates a persistent cart in a concrete region and currency.
 * 9. Customer adds a cart item referencing the constrained SKU with quantity 5
 *    (exceeding on_hand_quantity).
 * 10. Customer constructs an IShoppingMallOrder.ICreate payload using the cart id
 *     as customer_cart_id and a self-consistent set of totals derived from the
 *     SKU price and quantity.
 * 11. Customer calls POST /shoppingMall/customer/orders to create the order.
 * 12. The test asserts that the returned order is structurally valid
 *     (typia.assert), references the expected customer and cart, and has
 *     internally consistent monetary fields.
 */
export async function test_api_customer_order_creation_with_insufficient_inventory(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin logs in (exercise login API)
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Platform admin creates a category tree
  const categoryTreeBody = {
    code: `ct-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 4. Platform admin creates a brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    logo_uri: "https://cdn.shoppingmall.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 6. Seller logs in
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 7. Seller creates a product associated with the brand
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}` as string;

  const productBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.local/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 8. Seller creates a SKU
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. Seller creates an inventory item with limited on_hand_quantity
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 1,
    low_stock_threshold: 0,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 10. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 11. Customer logs in
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 12. Customer creates a persistent cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      scenario: "insufficient_inventory_order_creation",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 13. Customer adds a cart item referencing the constrained SKU with quantity > on_hand_quantity
  const requestedQuantity = 5;

  const cartItemBody = {
    skuId: sku.id,
    quantity: requestedQuantity,
    note: "Over-quantity request for inventory validation scenario",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 14. Build order totals based on SKU salePrice and requested quantity.
  // We do not have a dedicated totals API, so we derive a simple self-consistent
  // snapshot under the assumption of no discounts, taxes, or shipping.
  const itemsSubtotalAmount = sku.salePrice * requestedQuantity;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 0;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount -
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  // Sanity: all amounts must be non-negative
  TestValidator.predicate(
    "items_subtotal_amount is non-negative",
    itemsSubtotalAmount >= 0,
  );
  TestValidator.predicate(
    "grand_total_amount is non-negative",
    grandTotalAmount >= 0,
  );

  // 15. Customer creates an order from the cart
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please handle over-quantity scenario gracefully.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 16. Basic invariants about the created order
  TestValidator.equals(
    "order customer matches logged-in customer",
    order.customer.id,
    customerLoggedIn.id,
  );

  if (order.origin_customer_cart_id !== undefined) {
    TestValidator.equals(
      "order origin cart matches source cart",
      order.origin_customer_cart_id,
      cart.id,
    );
  }

  TestValidator.equals(
    "order currency_code matches requested currency",
    order.currency_code,
    orderCreateBody.currency_code,
  );

  TestValidator.predicate(
    "order items_subtotal_amount is non-negative",
    order.items_subtotal_amount >= 0,
  );

  TestValidator.predicate(
    "order grand_total_amount is not less than subtotal minus discounts plus shipping and tax",
    order.grand_total_amount >=
      order.items_subtotal_amount -
        order.discount_total_amount +
        order.shipping_total_amount +
        order.tax_total_amount,
  );
}
