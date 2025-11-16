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

export async function test_api_customer_order_summary_after_successful_checkout(
  connection: api.IConnection,
) {
  // 1. Join actors: platformAdmin, seller, customer
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass!123",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "SellerPass!123",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerPass!123",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Platform admin creates basic catalog dependencies: category tree and brand
  // (Not strictly required for the order summary but aligns with scenario dependencies.)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  const brandCreateBody = {
    name: `Brand-${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://static.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller catalog setup: product, option type, option value, SKU, inventory
  const sellerProductCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphabets(8)}`,
    name: "Test Product for Order Summary",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://static.example.com/product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphabets(6)}`,
    name: "Test SKU M",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  TestValidator.predicate(
    "inventory should have non-negative on hand quantity",
    inventory.on_hand_quantity >= 0,
  );

  // 4. Customer creates a cart and adds an item
  const cartCreateBody = {
    currency_code: sku.currency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
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

  TestValidator.equals(
    "cart currency matches sku currency",
    cart.currency_code,
    sku.currency,
  );

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 2,
    note: "Order summary E2E test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.predicate(
    "cart item quantity should be positive",
    cartItem.quantity > 0,
  );

  // 5. Create an order from the cart
  const itemsSubtotal = sku.salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver between 9am-6pm.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order grand total should equal requested grand total",
    order.grand_total_amount,
    grandTotal,
  );

  // 6. Retrieve order summary and validate coherence
  const summary: IShoppingMallOrderSummary =
    await api.functional.shoppingMall.customer.orders.summary.at(connection, {
      orderId: order.id,
    });
  typia.assert(summary);

  TestValidator.equals("summary id matches order id", summary.id, order.id);
  TestValidator.equals(
    "summary customer matches order customer",
    summary.customer.id,
    order.customer.id,
  );
  TestValidator.equals(
    "summary currency matches order currency",
    summary.currency,
    order.currency_code,
  );
  TestValidator.equals(
    "summary grand total matches order grand total",
    summary.grandTotalAmount,
    order.grand_total_amount,
  );
  TestValidator.equals(
    "summary status matches order status",
    summary.status,
    order.order_status,
  );
  TestValidator.equals(
    "summary payment status matches order payment status",
    summary.paymentStatus,
    order.payment_status,
  );

  if (summary.subtotalAmount !== undefined) {
    TestValidator.equals(
      "summary subtotal matches order items subtotal",
      summary.subtotalAmount,
      order.items_subtotal_amount,
    );
  }
  if (summary.discountAmount !== undefined) {
    TestValidator.equals(
      "summary discount matches order discount total",
      summary.discountAmount,
      order.discount_total_amount,
    );
  }
  if (summary.shippingAmount !== undefined) {
    TestValidator.equals(
      "summary shipping matches order shipping total",
      summary.shippingAmount,
      order.shipping_total_amount,
    );
  }
  if (summary.taxAmount !== undefined) {
    TestValidator.equals(
      "summary tax matches order tax total",
      summary.taxAmount,
      order.tax_total_amount,
    );
  }

  TestValidator.predicate(
    "summary itemCount should be at least 1",
    summary.itemCount >= 1,
  );

  if (summary.sellerSegments !== undefined) {
    const totalSegmentItems = summary.sellerSegments.reduce(
      (acc, seg) => acc + seg.itemCount,
      0,
    );

    TestValidator.predicate(
      "sum of seller segment itemCounts should be positive",
      totalSegmentItems >= 1,
    );

    summary.sellerSegments.forEach(
      (segment: IShoppingMallOrderSellerSegmentSummary) => {
        TestValidator.predicate(
          "seller segment grand total should be non-negative",
          segment.grandTotalAmount >= 0,
        );
      },
    );
  }

  // 7. Stability check: re-fetch summary and compare key snapshot fields
  const summaryAgain: IShoppingMallOrderSummary =
    await api.functional.shoppingMall.customer.orders.summary.at(connection, {
      orderId: order.id,
    });
  typia.assert(summaryAgain);

  TestValidator.equals("summary id stable", summaryAgain.id, summary.id);
  TestValidator.equals("summary code stable", summaryAgain.code, summary.code);
  TestValidator.equals(
    "summary customer id stable",
    summaryAgain.customer.id,
    summary.customer.id,
  );
  TestValidator.equals(
    "summary currency stable",
    summaryAgain.currency,
    summary.currency,
  );
  TestValidator.equals(
    "summary grand total stable",
    summaryAgain.grandTotalAmount,
    summary.grandTotalAmount,
  );
  TestValidator.equals(
    "summary status stable",
    summaryAgain.status,
    summary.status,
  );
  TestValidator.equals(
    "summary payment status stable",
    summaryAgain.paymentStatus,
    summary.paymentStatus,
  );
  TestValidator.equals(
    "summary itemCount stable",
    summaryAgain.itemCount,
    summary.itemCount,
  );
}
