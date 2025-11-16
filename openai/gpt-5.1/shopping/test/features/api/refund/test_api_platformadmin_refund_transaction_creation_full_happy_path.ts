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
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_platformadmin_refund_transaction_creation_full_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and keep their credentials
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Register a seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: `Store-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 3. As platformAdmin, create category tree and brand
  // Switch back to admin (SDK will set Authorization header)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  const brandBody = {
    name: `Brand-${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. As seller, create product, option type, option value, SKU, and inventory
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Refundable Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuCurrency = "USD";
  const skuPrice = 100;
  const skuBody = {
    code: skuCode,
    name: "Size M",
    listPrice: skuPrice,
    salePrice: skuPrice,
    currency: skuCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 5. Register customer and authenticate
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 6. Customer creates cart and adds item
  const cartBody = {
    currency_code: skuCurrency,
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Refund test item",
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

  // 7. Optionally create wishlist and move item between wishlist and cart
  const wishlistBody = {
    name: "Refund Scenario Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  const wishlistItemBody = {
    shopping_mall_product_id: null,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody,
      },
    );
  typia.assert(wishlistItem);

  const cartFromWishlist: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.wishlists.items.moveToCart(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(cartFromWishlist);

  const cartBackToWishlist: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.items.moveToWishlist(
      connection,
      {
        customerCartId: cartFromWishlist.id,
        customerCartItemId: cartItem.id,
      },
    );
  typia.assert(cartBackToWishlist);

  // 8. Create an order from the customer cart
  const itemsSubtotal = skuPrice;
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: skuCurrency,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: itemsSubtotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Refund scenario order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order grand_total_amount matches snapshot",
    order.grand_total_amount,
    orderBody.grand_total_amount,
  );

  // 9. As platformAdmin, create payment method and payment transaction
  const adminLoginForPayment: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForPayment);

  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Credit Card",
    description: "Test payment method for refund E2E",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: skuCurrency,
    min_amount: 0,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `pi_${RandomGenerator.alphaNumeric(10)}`,
    providerName: "test-gateway",
    providerTransactionId: `tx_${RandomGenerator.alphaNumeric(10)}`,
    currency: skuCurrency as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: itemsSubtotal,
    capturedAmount: itemsSubtotal,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;
  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionBody,
      },
    );
  typia.assert(paymentTransaction);

  TestValidator.equals(
    "payment transaction orderId matches order.id",
    paymentTransaction.orderId,
    order.id,
  );

  // 10. As platformAdmin, create a refund transaction
  const refundNumber = `RFND-${RandomGenerator.alphaNumeric(8)}`;
  const refundRequestedAmount = itemsSubtotal;
  const refundBody = {
    shopping_mall_payment_transaction_id: paymentTransaction.id,
    shopping_mall_order_id: order.id,
    refund_number: refundNumber,
    refund_status: "refund_pending",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: "Admin-initiated full refund for E2E test.",
    requested_amount: refundRequestedAmount,
    approved_amount: refundRequestedAmount,
    refunded_amount: null,
    currency: skuCurrency,
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundBody,
    });
  typia.assert(refund);

  // 11. Validate refund transaction wiring and key attributes
  TestValidator.equals(
    "refund.payment_transaction_id matches created paymentTransaction.id",
    refund.shopping_mall_payment_transaction_id,
    paymentTransaction.id,
  );
  TestValidator.equals(
    "refund.order_id matches order.id",
    refund.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund_number is persisted",
    refund.refund_number,
    refundNumber,
  );
  TestValidator.equals(
    "refund_status is pending",
    refund.refund_status,
    refundBody.refund_status,
  );
  TestValidator.equals(
    "refund actor_type is admin",
    refund.actor_type,
    "admin",
  );
  TestValidator.equals(
    "refund reason_category is admin_adjustment",
    refund.reason_category,
    refundBody.reason_category,
  );
  TestValidator.equals(
    "refund requested_amount matches body",
    refund.requested_amount,
    refundRequestedAmount,
  );
  TestValidator.equals(
    "refund approved_amount matches body",
    refund.approved_amount,
    refundBody.approved_amount,
  );
  TestValidator.equals("refund currency matches", refund.currency, skuCurrency);

  TestValidator.predicate(
    "refund refunded_amount is null at creation",
    refund.refunded_amount === null || refund.refunded_amount === undefined,
  );

  // Association validations
  TestValidator.equals(
    "embedded paymentTransaction.id matches original",
    refund.paymentTransaction.id,
    paymentTransaction.id,
  );
  TestValidator.equals(
    "embedded order.id matches original order",
    refund.order.id,
    order.id,
  );

  // If initiatorPlatformAdmin is present, it must correspond to admin id
  if (
    refund.initiatorPlatformAdmin !== null &&
    refund.initiatorPlatformAdmin !== undefined
  ) {
    TestValidator.equals(
      "initiatorPlatformAdmin id matches admin.id",
      refund.initiatorPlatformAdmin.id,
      admin.id,
    );
  }
}
