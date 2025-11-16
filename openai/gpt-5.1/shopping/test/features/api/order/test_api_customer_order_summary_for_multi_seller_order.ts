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
import type { IShoppingMallOrderSellerSegmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegmentSummary";
import type { IShoppingMallOrderSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate multi-seller aggregation in customer order summary.
 *
 * This test constructs a realistic multi-actor workflow where a customer places
 * a single order that includes items sold by two different sellers. It then
 * calls the customer-facing order summary endpoint and validates that the
 * summarized view correctly reflects both the overall order snapshot and the
 * per-seller breakdowns.
 *
 * High-level steps:
 *
 * 1. Register and authenticate a platform admin (for catalog bootstrap duties).
 * 2. Register and authenticate a first seller, and create a product with one
 *    option type, one option value, and a single SKU; then create inventory.
 * 3. Register and authenticate a second seller via platformAdmin pathway by
 *    creating a product with a different shopping_mall_seller_id and SKU, plus
 *    inventory.
 * 4. Register and authenticate a customer.
 * 5. As the customer, create a persistent cart and add one SKU from each seller
 *    into the same cart.
 * 6. Compute reasonable snapshot numbers from the two SKUs and create an order
 *    from the cart via POST /shoppingMall/customer/orders.
 * 7. Fetch the summary via GET /shoppingMall/customer/orders/{orderId}/summary.
 * 8. Assert that:
 *
 *    - ItemCount equals the total number of units across all lines.
 *    - Currency equals the order currency_code.
 *    - Subtotal/discount/shipping/tax/grandTotal fields, when present, match the
 *         corresponding fields on the underlying IShoppingMallOrder.
 *    - SellerSegments is defined, has at least 2 segments, and each segment has a
 *         positive itemCount and non-negative grandTotalAmount.
 *    - The sum of seller segment grandTotalAmount does not exceed the master order
 *         grand_total_amount.
 */
export async function test_api_customer_order_summary_for_multi_seller_order(
  connection: api.IConnection,
) {
  // Helper to build common URLs
  const href: string = "https://example.com/join";
  const referrer: string = "https://example.com/landing";

  // 1. Platform admin join & login (join already authenticates and sets token)
  const platformAdminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@admin.test",
    name: RandomGenerator.name(),
    password: "AdminPassw0rd!",
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // Explicit login to exercise login flow and ensure token refresh works
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminSession);

  // 2. Create category tree (not strictly required by products here but
  // executed to satisfy dependency and ensure basic admin catalog bootstrapping
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Create a shared brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Register Seller 1
  const seller1JoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@seller1.test",
    password: "Seller1Pass!",
    storeName: `Seller1-${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller1Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller1JoinBody,
    });
  typia.assert(seller1Auth);

  // Explicit login for seller1 to ensure token rotation and role context
  const seller1LoginBody = {
    email: seller1JoinBody.email,
    password: seller1JoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;
  const seller1Session: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: seller1LoginBody,
    });
  typia.assert(seller1Session);

  // 5. Seller 1 product with option type, value, SKU and inventory
  const seller1ProductCode = `P1-${RandomGenerator.alphaNumeric(8)}`;
  const seller1ProductCreateBody = {
    shopping_mall_seller_id: seller1Session.id,
    shopping_mall_brand_id: brand.id,
    code: seller1ProductCode,
    name: `Product 1 - ${RandomGenerator.name(2)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://example.com/p1.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const seller1Product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: seller1ProductCreateBody,
    });
  typia.assert(seller1Product);

  // Option type for Seller 1 product
  const seller1OptionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const seller1OptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: seller1Product.code,
        body: seller1OptionTypeCreateBody,
      },
    );
  typia.assert(seller1OptionType);

  // Option value for Seller 1 product
  const seller1OptionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const seller1OptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: seller1Product.code,
        productOptionTypeId: seller1OptionType.id,
        body: seller1OptionValueCreateBody,
      },
    );
  typia.assert(seller1OptionValue);

  // SKU for Seller 1 product
  const seller1SkuCode = `S1-${RandomGenerator.alphaNumeric(8)}`;
  const seller1SkuCreateBody = {
    code: seller1SkuCode,
    name: `SKU1 ${seller1OptionValue.value}`,
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const seller1Sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: seller1Product.code,
      body: seller1SkuCreateBody,
    });
  typia.assert(seller1Sku);

  // Inventory for Seller 1 SKU
  const seller1InventoryCreateBody = {
    product_sku_id: seller1Sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const seller1Inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: seller1InventoryCreateBody,
    });
  typia.assert(seller1Inventory);

  // 6. Register Seller 2 and create product via platformAdmin pathway using different seller id
  const seller2JoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@seller2.test",
    password: "Seller2Pass!",
    storeName: `Seller2-${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller2Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller2JoinBody,
    });
  typia.assert(seller2Auth);

  const seller2LoginBody = {
    email: seller2JoinBody.email,
    password: seller2JoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;
  const seller2Session: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: seller2LoginBody,
    });
  typia.assert(seller2Session);

  // Use platformAdmin products.create to simulate alternate seller segment
  const seller2ProductCode = `P2-${RandomGenerator.alphaNumeric(8)}`;
  const seller2ProductCreateBody = {
    shopping_mall_seller_id: seller2Session.id,
    shopping_mall_brand_id: brand.id,
    code: seller2ProductCode,
    name: `Product 2 - ${RandomGenerator.name(2)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://example.com/p2.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const seller2Product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: seller2ProductCreateBody,
      },
    );
  typia.assert(seller2Product);

  const seller2SkuCode = `S2-${RandomGenerator.alphaNumeric(8)}`;
  const seller2SkuCreateBody = {
    code: seller2SkuCode,
    name: `SKU2 default`,
    listPrice: 20000,
    salePrice: 15000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const seller2Sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: seller2Product.code,
        body: seller2SkuCreateBody,
      },
    );
  typia.assert(seller2Sku);

  const seller2InventoryCreateBody = {
    product_sku_id: seller2Sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const seller2Inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: seller2InventoryCreateBody,
    });
  typia.assert(seller2Inventory);

  // 7. Register and login customer
  const customerJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@customer.test",
    password: "CustomerPass!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerSession: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerSession);

  // 8. Create customer cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      scenario: "multi-seller-summary",
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

  // 9. Add items from both sellers
  const quantity1 = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const quantity2 = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItem1CreateBody = {
    skuId: seller1Sku.id,
    quantity: quantity1,
    note: "From seller1",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem1: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItem1CreateBody,
      },
    );
  typia.assert(cartItem1);

  const cartItem2CreateBody = {
    skuId: seller2Sku.id,
    quantity: quantity2,
    note: "From seller2",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem2: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItem2CreateBody,
      },
    );
  typia.assert(cartItem2);

  // 10. Snapshot totals for order creation.
  // Here we compute simple snapshots from SKU sale prices; in a real
  // implementation, the backend will validate against authoritative numbers.
  const itemSubtotal =
    seller1Sku.salePrice * cartItem1.quantity +
    seller2Sku.salePrice * cartItem2.quantity;

  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Multi-seller order test",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 11. Fetch summary
  const summary: IShoppingMallOrderSummary =
    await api.functional.shoppingMall.customer.orders.summary.at(connection, {
      orderId: order.id,
    });
  typia.assert(summary);

  // 12. Validate basic identity and status coherence
  TestValidator.equals(
    "summary order id should match order id",
    summary.id,
    order.id,
  );
  TestValidator.equals(
    "summary currency should match order currency",
    summary.currency,
    order.currency_code,
  );

  // Payment and status should be non-empty strings that conceptually align
  TestValidator.predicate(
    "summary status is non-empty",
    summary.status.length > 0,
  );
  TestValidator.predicate(
    "summary paymentStatus is non-empty",
    summary.paymentStatus.length > 0,
  );

  // 13. Validate monetary snapshot alignment where present
  if (summary.subtotalAmount !== undefined) {
    TestValidator.equals(
      "summary subtotalAmount matches order items_subtotal_amount",
      summary.subtotalAmount,
      order.items_subtotal_amount,
    );
  }
  if (summary.discountAmount !== undefined) {
    TestValidator.equals(
      "summary discountAmount matches order discount_total_amount",
      summary.discountAmount,
      order.discount_total_amount,
    );
  }
  if (summary.shippingAmount !== undefined) {
    TestValidator.equals(
      "summary shippingAmount matches order shipping_total_amount",
      summary.shippingAmount,
      order.shipping_total_amount,
    );
  }
  if (summary.taxAmount !== undefined) {
    TestValidator.equals(
      "summary taxAmount matches order tax_total_amount",
      summary.taxAmount,
      order.tax_total_amount,
    );
  }
  TestValidator.equals(
    "summary grandTotalAmount matches order grand_total_amount",
    summary.grandTotalAmount,
    order.grand_total_amount,
  );

  // 14. Validate itemCount as total quantity from both cart items
  const expectedItemCount =
    (cartItem1.quantity satisfies number as number) +
    (cartItem2.quantity satisfies number as number);
  TestValidator.equals(
    "summary itemCount equals total quantity",
    summary.itemCount,
    expectedItemCount,
  );

  // 15. Validate seller segment breakdown when available
  if (summary.sellerSegments !== undefined) {
    const segments: IShoppingMallOrderSellerSegmentSummary[] =
      summary.sellerSegments;

    TestValidator.predicate(
      "summary has at least two seller segments",
      segments.length >= 2,
    );

    // Ensure each segment has positive itemCount and non-negative grandTotal
    for (const segment of segments) {
      TestValidator.predicate(
        "segment itemCount positive",
        segment.itemCount > 0,
      );
      TestValidator.predicate(
        "segment grandTotalAmount non-negative",
        segment.grandTotalAmount >= 0,
      );
    }

    const totalSegmentItems = segments.reduce(
      (acc, s) => acc + (s.itemCount satisfies number as number),
      0,
    );
    TestValidator.equals(
      "sum of segment itemCount should equal summary itemCount",
      totalSegmentItems,
      summary.itemCount,
    );

    const totalSegmentGrand = segments.reduce(
      (acc, s) => acc + s.grandTotalAmount,
      0,
    );
    TestValidator.predicate(
      "sum of segment grandTotalAmount does not exceed order grand_total_amount",
      totalSegmentGrand <= order.grand_total_amount + 1e-6,
    );
  }
}
