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
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Platform admin initiated cancellation for a risk-flagged order.
 *
 * Business goal: Verify that a platform administrator can create a cancellation
 * request for an order that has been identified as high-risk or
 * policy-violating, even when neither the customer nor seller has initiated
 * cancellation. The test focuses on ensuring that the platformAdmin-scoped
 * endpoint correctly associates the request with the target order, attributes
 * the actor_type to "platformAdmin", and preserves the request reason fields
 * from the payload.
 *
 * High level workflow
 *
 * 1. Bootstrap three actors via auth APIs:
 *
 *    - Platform admin (for catalog configuration and cancellation)
 *    - Seller (owns catalog product and inventory)
 *    - Customer (places the order)
 * 2. As platform admin:
 *
 *    - Create a category tree (for realistic catalog context)
 *    - Create a brand
 *    - Create a product that belongs to the seller and optionally to the brand
 *    - Create a SKU for that product
 * 3. As seller:
 *
 *    - Create an inventory item for the SKU with enough on_hand_quantity so that at
 *         least one unit is purchasable
 * 4. As customer:
 *
 *    - Create a customer cart with reasonable currency and region settings
 *    - Create a cart item pointing to the product SKU with quantity 1
 *    - Construct an order snapshot body (IShoppingMallOrder.ICreate) that references
 *         the cart and uses realistic totals consistent with a simple
 *         single-line order (items_subtotal_amount = unit price, no discounts,
 *         simple shipping and tax values)
 *    - Call api.functional.shoppingMall.customer.orders.create to create the master
 *         order
 * 5. As platform admin again:
 *
 *    - Treat the created order as risk-flagged (no explicit risk API needed in this
 *         test)
 *    - Call api.functional.shoppingMall.platformAdmin.orders.cancellationRequests.create
 *         with orderId = created order.id and body:
 *         IShoppingMallOrderCancellationRequest.ICreate where
 *         request_reason_category = "policy_violation" and
 *         request_reason_detail is a descriptive string
 * 6. Validate the cancellation request response:
 *
 *    - Typia.assert on the returned IShoppingMallOrderCancellationRequest
 *    - Actor_type must be "platformAdmin"
 *    - Order.id in the nested order summary must equal the created order.id
 *    - Request_reason_category and request_reason_detail must echo the request body
 *         values
 *    - Request_status is a non-empty string (we treat any non-empty value as a valid
 *         initial state for this scenario)
 */
export async function test_api_platform_admin_order_cancellation_request_for_risk_flagged_order(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.local/join",
    referrer: "https://admin.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Ensure we are logged in as platform admin (join already sets token but we
  // also exercise login in case future flows rely on it)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.local/login",
    referrer: "https://admin.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Register and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "P@ssw0rd!",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://seller.local/login",
    referrer: "https://seller.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 3. Register and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.local/join",
    referrer: "https://shop.local/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://shop.local/login",
    referrer: "https://shop.local/",
    userAgent: "E2E-Customer-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 4. As platform admin: create catalog entities (category tree, brand, product, SKU)
  // Switch back to platform admin session
  const reloginPlatformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(reloginPlatformAdmin);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
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
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://static.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Risk Test Product" as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://static.local/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const listPrice = 10000;
  const salePrice = 9500;
  const skuBody = {
    code: skuCode,
    name: "Default Variant",
    listPrice,
    salePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      { productCode, body: skuBody },
    );
  typia.assert(sku);

  // 5. As seller: create inventory item for the SKU
  const reloginSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(reloginSeller);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. As customer: create cart, add item, create order
  const reloginCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(reloginCustomer);

  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: { scenario: "risk_cancellation" },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Risk test order line",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      { customerCartId: cart.id, body: cartItemBody },
    );
  typia.assert(cartItem);

  const itemsSubtotal = salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 2500;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Order for risk cancellation test",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Switch back to platform admin: create cancellation request
  const platformAdminReloginForCancel: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReloginForCancel);

  const cancellationBody = {
    request_reason_category: "policy_violation",
    request_reason_detail:
      "Order flagged by risk engine for suspected policy violation during E2E test.",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.platformAdmin.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationBody,
      },
    );
  typia.assert(cancellationRequest);

  // 8. Validate cancellation request fields
  TestValidator.equals(
    "cancellation actor type is platformAdmin",
    cancellationRequest.actor_type,
    "platformAdmin",
  );

  TestValidator.equals(
    "cancellation order id matches original order",
    cancellationRequest.order.id,
    order.id,
  );

  TestValidator.equals(
    "cancellation reason category echoes request body",
    cancellationRequest.request_reason_category,
    cancellationBody.request_reason_category,
  );

  TestValidator.equals(
    "cancellation reason detail echoes request body",
    cancellationRequest.request_reason_detail,
    cancellationBody.request_reason_detail,
  );

  TestValidator.predicate(
    "cancellation request_status is non-empty string",
    typeof cancellationRequest.request_status === "string" &&
      cancellationRequest.request_status.length > 0,
  );
}
