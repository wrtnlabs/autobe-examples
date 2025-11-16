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
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderDisputeCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDisputeCustomer";
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

/**
 * Verify that only platform admins can access the customer-specific dispute
 * view endpoint while other actors are rejected.
 *
 * This test orchestrates a realistic workflow to obtain a valid order/dispute
 * pair, then exercises the GET
 * /shoppingMall/platformAdmin/orders/{orderId}/disputes/{disputeId}/customer
 * endpoint under different authorization contexts.
 *
 * High-level steps:
 *
 * 1. Register a platform admin and perform basic catalog setup so an order can be
 *    created.
 * 2. Register a customer, create a cart, add an item, create an order, and open a
 *    dispute.
 * 3. Call the platform-admin dispute-customer view unauthenticated (no
 *    Authorization header) and expect an error.
 * 4. Call the same endpoint as an authenticated customer and expect an error.
 * 5. Register and login a seller, call the endpoint as a seller and expect an
 *    error.
 * 6. Login back as the platform admin and verify that the endpoint succeeds and
 *    returns a consistent IShoppingMallOrderDisputeCustomer view.
 */
export async function test_api_platformadmin_dispute_customer_view_authorization_required(
  connection: api.IConnection,
) {
  // 1. Platform admin registration and catalog setup
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a category tree (not strictly required by the dispute flow, but realistic catalog setup)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // Create a brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/brand-logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // For product creation, we need a seller id. However, the product creation
  // DTO only requires a shopping_mall_seller_id UUID and does not enforce that
  // it matches an existing auth seller in this test scope. We can therefore
  // generate a random UUID for the seller id solely to satisfy the type.
  const syntheticSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode: string & tags.MinLength<1> =
    `prod-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: syntheticSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // Create a SKU for the product
  const skuCode: string = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.name(2),
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
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 2. Customer registration, cart, order, and dispute
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Create a customer cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  // Add SKU as cart item
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: null,
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

  // Create an order from the cart. For testing, we use consistent snapshot numbers.
  const itemsSubtotal = 80;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 9;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // Create a dispute for the order as the customer
  const disputeCreateBody = {
    shopping_mall_order_line_id: null,
    issue_category: "non_delivery",
    issue_title: "Package not received",
    issue_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallOrderDispute.ICreate;

  const dispute: IShoppingMallOrderDispute =
    await api.functional.shoppingMall.customer.orders.disputes.create(
      connection,
      {
        orderId: order.id,
        body: disputeCreateBody,
      },
    );
  typia.assert(dispute);

  // 3. Authorization behavior checks
  // 3-1. Unauthenticated call (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated access must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.orders.disputes.customer.at(
      unauthConnection,
      {
        orderId: order.id,
        disputeId: dispute.id,
      },
    );
  });

  // 3-2. Customer-authenticated call
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  await TestValidator.error(
    "customer-authenticated access must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.orders.disputes.customer.at(
        connection,
        {
          orderId: order.id,
          disputeId: dispute.id,
        },
      );
    },
  );

  // 3-3. Seller-authenticated call
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: undefined,
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  await TestValidator.error(
    "seller-authenticated access must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.orders.disputes.customer.at(
        connection,
        {
          orderId: order.id,
          disputeId: dispute.id,
        },
      );
    },
  );

  // 3-4. Platform admin-authenticated call (success)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  const customerDisputeView: IShoppingMallOrderDisputeCustomer =
    await api.functional.shoppingMall.platformAdmin.orders.disputes.customer.at(
      connection,
      {
        orderId: order.id,
        disputeId: dispute.id,
      },
    );
  typia.assert(customerDisputeView);

  // Business assertions on the successful view
  TestValidator.equals(
    "dispute_id must match created dispute",
    customerDisputeView.dispute_id,
    dispute.id,
  );

  if (customerDisputeView.dispute !== undefined) {
    TestValidator.equals(
      "dispute summary order id must match order",
      customerDisputeView.dispute.order.id,
      order.id,
    );
  }
}
