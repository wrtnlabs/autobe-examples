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
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_payment_method_delete_conflict_when_in_use(
  connection: api.IConnection,
) {
  // 0. Helper to build common URLs for href/referrer
  const frontendBase = "https://shoppingmall.example.com";

  // 1. Platform admin joins (registers) and obtains authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "AdminPassword!123",
    ip: "203.0.113.10",
    href: `${frontendBase}/admin/signup`,
    referrer: `${frontendBase}/landing`,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As platform admin, prepare minimal catalog context
  // 2-1. Create a category tree (optional but realistic)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  // 2-2. Create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logos/brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2-3. Create a product for some seller
  // We do not have seller join APIs, so rely on a random UUID that backend
  // (or simulate mode) can accept.
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/products/image.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 2-4. Create a SKU under the product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 90,
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

  // 3. Customer joins and logs in
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerPassword!123",
    name: RandomGenerator.name(),
    ip: "198.51.100.23",
    href: `${frontendBase}/signup`,
    referrer: `${frontendBase}/landing`,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer creates a cart
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
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
      { body: cartBody },
    );
  typia.assert(cart);

  // 5. Customer adds the SKU as a cart item
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test item",
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

  // 6. Customer creates an order from the cart
  // Use simple snapshot amounts that are consistent with SKU price and qty
  const itemsSubtotal = 90;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 9;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Switch back to platform admin by logging in explicitly
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "203.0.113.11",
    href: `${frontendBase}/admin/login`,
    referrer: `${frontendBase}/admin`,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 8. Create a payment method configuration
  const paymentMethodBody = {
    code: `pay-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Credit Card",
    description: "E2E test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: "USD",
    min_amount: 1,
    max_amount: 100000,
    priority: 10 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 9. Create a payment transaction referencing the payment method and order
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: customerAuthorized.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(10)}`,
    providerName: paymentMethod.provider_key ?? "test-gateway",
    providerTransactionId: `prov-${RandomGenerator.alphaNumeric(10)}`,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: "INITIATED",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionBody },
    );
  typia.assert(paymentTransaction);

  // 9-1. Validate linkage to payment method
  TestValidator.equals(
    "payment transaction should reference the created payment method id",
    paymentTransaction.paymentMethodId,
    paymentMethod.id,
  );

  if (paymentTransaction.paymentMethod !== undefined) {
    TestValidator.equals(
      "embedded payment method summary, when present, should have same id",
      paymentTransaction.paymentMethod.id,
      paymentMethod.id,
    );
  }

  // 10. Attempt to delete the in-use payment method and expect an error
  await TestValidator.error(
    "deleting an in-use payment method must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentMethods.erase(
        connection,
        { paymentMethodId: paymentMethod.id },
      );
    },
  );

  // 11. Ensure the in-memory payment transaction object remains consistent
  typia.assert<IShoppingMallPaymentTransaction>(paymentTransaction);
  TestValidator.equals(
    "payment transaction still linked to the same order after failed deletion",
    paymentTransaction.orderId,
    order.id,
  );
  TestValidator.equals(
    "payment transaction still linked to the same payment method after failed deletion",
    paymentTransaction.paymentMethodId,
    paymentMethod.id,
  );
}
