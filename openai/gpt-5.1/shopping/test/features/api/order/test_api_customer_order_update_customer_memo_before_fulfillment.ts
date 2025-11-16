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
 * Verify that a customer can update the memo of their own order before
 * fulfillment, and that only the allowed mutable field changes.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in (to own platform-scope resources like
 *    category tree and brand if needed).
 * 2. Seller joins and logs in.
 * 3. Platform admin creates a category tree and a brand.
 * 4. Seller creates a product associated to that brand.
 * 5. Seller creates a SKU for that product.
 * 6. Seller provisions inventory for that SKU, so that orders can be created.
 * 7. Customer joins and logs in.
 * 8. Customer creates a persistent cart.
 * 9. Customer adds an item (the SKU) into the cart.
 * 10. Customer creates an order from that cart, capturing monetary snapshot fields
 *     and initial statuses.
 * 11. Customer calls PUT /shoppingMall/customer/orders/{orderId} with
 *     IShoppingMallOrder.IUpdate to update the customer_memo field.
 * 12. Assert that:
 *
 *     - The returned order reflects the new memo (mapped to customer_note).
 *     - Updated_at increases.
 *     - Monetary snapshot fields and status fields are unchanged.
 */
export async function test_api_customer_order_update_customer_memo_before_fulfillment(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (validate login flow, also ensures token refresh works)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Seller joins and logs in
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

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Platform admin context: create category tree and brand
  const platformAdminReLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReLogin);

  const categoryTreeBody = {
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
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Seller context: create product associated with brand
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}` as string;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Test Product" as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Seller creates SKU for that product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const skuBody = {
    code: skuCode,
    name: "Default SKU",
    listPrice: 100,
    salePrice: 90,
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

  // 7. Seller provisions inventory for this SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 8. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
    userAgent: "Mozilla/5.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 9. Customer creates a persistent cart
  const customerCartBody = {
    currency_code: sku.currency,
    region_code: "US",
    channel: "web",
    metadata: { campaign: "spring-sale" },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartBody,
      },
    );
  typia.assert(customerCart);

  // 10. Customer adds an item to the cart using the SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "First item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 11. Customer creates an order from the cart
  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: customerCart.subtotal_amount,
    discount_total_amount: customerCart.discount_amount,
    shipping_total_amount: customerCart.shipping_amount,
    tax_total_amount: customerCart.tax_amount,
    grand_total_amount: customerCart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver between 9am-6pm.",
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(createdOrder);

  // Capture immutable fields for later comparison
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdOrder.updated_at;
  const originalItemsSubtotal = createdOrder.items_subtotal_amount;
  const originalDiscountTotal = createdOrder.discount_total_amount;
  const originalShippingTotal = createdOrder.shipping_total_amount;
  const originalTaxTotal = createdOrder.tax_total_amount;
  const originalGrandTotal = createdOrder.grand_total_amount;
  const originalOrderStatus = createdOrder.order_status;
  const originalPaymentStatus = createdOrder.payment_status;

  // 12. Customer updates the order memo before fulfillment
  const newMemo = "Leave the package at the front door, do not ring the bell.";

  const updateBody = {
    customer_memo: newMemo,
  } satisfies IShoppingMallOrder.IUpdate;

  const updatedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.update(connection, {
      orderId: createdOrder.id,
      body: updateBody,
    });
  typia.assert(updatedOrder);

  // 13. Business assertions
  TestValidator.equals(
    "customer memo is reflected in customer_note",
    updatedOrder.customer_note,
    newMemo,
  );

  TestValidator.predicate(
    "updated_at has advanced after memo update",
    new Date(updatedOrder.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  TestValidator.equals(
    "items_subtotal_amount remains unchanged",
    updatedOrder.items_subtotal_amount,
    originalItemsSubtotal,
  );
  TestValidator.equals(
    "discount_total_amount remains unchanged",
    updatedOrder.discount_total_amount,
    originalDiscountTotal,
  );
  TestValidator.equals(
    "shipping_total_amount remains unchanged",
    updatedOrder.shipping_total_amount,
    originalShippingTotal,
  );
  TestValidator.equals(
    "tax_total_amount remains unchanged",
    updatedOrder.tax_total_amount,
    originalTaxTotal,
  );
  TestValidator.equals(
    "grand_total_amount remains unchanged",
    updatedOrder.grand_total_amount,
    originalGrandTotal,
  );

  TestValidator.equals(
    "order_status remains unchanged",
    updatedOrder.order_status,
    originalOrderStatus,
  );
  TestValidator.equals(
    "payment_status remains unchanged",
    updatedOrder.payment_status,
    originalPaymentStatus,
  );
}
