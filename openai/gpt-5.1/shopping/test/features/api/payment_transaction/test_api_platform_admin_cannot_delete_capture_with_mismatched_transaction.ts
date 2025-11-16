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
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
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
 * Ensure platform admin cannot delete a payment capture using a mismatched
 * payment transaction.
 *
 * Business flow (simplified to only what can be implemented with provided
 * APIs):
 *
 * 1. Join and login as platform admin (admin A) – used for all platformAdmin
 *    calls.
 * 2. Join and login as seller – used to create product, SKU and inventory.
 * 3. Join and login as customer – used to create carts, items and orders.
 * 4. As seller: create a product, then a SKU for that product and an inventory
 *    item for that SKU.
 * 5. As customer: create a customer cart, add the SKU as a cart item, then create
 *    Order A from the cart.
 * 6. Switch to platform admin: create a payment method and then create Payment
 *    Transaction A for Order A.
 * 7. Create an authorization and a capture (Capture A) under Transaction A.
 * 8. Repeat steps 5–7 to create Order B and Payment Transaction B (Tx B) with its
 *    own authorization and capture.
 * 9. Attempt to delete Capture A by calling DELETE
 *    /shoppingMall/platformAdmin/paymentTransactions/{paymentTransactionId}/captures/{captureId}
 *    with paymentTransactionId = Tx B.id and captureId = Capture A.id. Expect
 *    an HttpError (client-side error such as 400/404) and validate using
 *    TestValidator.error.
 * 10. After the failed mismatched delete, perform a correctly scoped delete: DELETE
 *     with paymentTransactionId = Tx A.id and captureId = Capture A.id and
 *     expect success (no error thrown).
 *
 * This proves that the erase endpoint enforces the parent-child relationship
 * between payment transactions and captures and that mismatched transaction IDs
 * cannot be used to delete captures belonging to other transactions.
 */
export async function test_api_platform_admin_cannot_delete_capture_with_mismatched_transaction(
  connection: api.IConnection,
) {
  // 1. Join platform admin
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Join seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Join customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(1),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Helper to relogin as platform admin when connection headers were changed by seller/customer joins
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  // 4. As seller: create brand, product, SKU, inventory.
  // Switch to seller session
  const _sellerReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(_sellerReAuth);

  // Brand is created as platformAdmin, so switch to platform admin for brand
  const _adminReAuthForBrand: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(_adminReAuthForBrand);

  const brandBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Switch to seller again to create product
  const _sellerReAuthForProduct: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(_sellerReAuthForProduct);

  const productCode = RandomGenerator.alphaNumeric(12);
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
    name: `${product.name} SKU`,
    listPrice: 100,
    salePrice: 100,
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

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // Helper: create order from new cart with a single cart item
  const createOrder = async (): Promise<IShoppingMallOrder> => {
    // customer session
    const _customerReAuth: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: customerLoginBody,
      });
    typia.assert(_customerReAuth);

    const cartBody = {
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
        {
          body: cartBody,
        },
      );
    typia.assert(cart);

    const cartItemBody = {
      skuId: sku.id,
      quantity: 1,
      note: null,
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

    const orderBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: cart.subtotal_amount,
      discount_total_amount: cart.discount_amount,
      shipping_total_amount: cart.shipping_amount,
      tax_total_amount: cart.tax_amount,
      grand_total_amount: cart.total_amount,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: undefined,
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);
    return order;
  };

  // Helper: create payment method once (platform admin)
  const _adminReAuthForPaymentMethod: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(_adminReAuthForPaymentMethod);

  const paymentMethodCode = RandomGenerator.alphaNumeric(10);
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "Test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
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

  // Helper: create full payment stack (transaction, authorization, capture) for given order
  const createPaymentFlow = async (
    order: IShoppingMallOrder,
  ): Promise<{
    transaction: IShoppingMallPaymentTransaction;
    authorization: IShoppingMallPaymentAuthorization;
    capture: IShoppingMallPaymentCapture;
  }> => {
    const _adminReAuth: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.login(connection, {
        body: platformAdminLoginBody,
      });
    typia.assert(_adminReAuth);

    const txBody = {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: null,
      providerName: "test-provider",
      providerTransactionId: null,
      currency: order.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: order.grand_total_amount,
      capturedAmount: null,
      paymentStatus: "payment_pending",
      providerStatus: null,
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: null,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const transaction: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        {
          body: txBody,
        },
      );
    typia.assert(transaction);

    const authBody = {
      amount: order.grand_total_amount,
      currency: transaction.currency,
      gateway_code: "test-gateway",
      gateway_authorization_id: RandomGenerator.alphaNumeric(16),
      channel: "web",
      risk_metadata: {},
    } satisfies IShoppingMallPaymentAuthorization.ICreate;

    const authorization: IShoppingMallPaymentAuthorization =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
        connection,
        {
          paymentTransactionId: transaction.id,
          body: authBody,
        },
      );
    typia.assert(authorization);

    const captureBody = {
      shopping_mall_payment_authorization_id: authorization.id,
      provider_capture_id: null,
      amount: order.grand_total_amount,
      currency: transaction.currency,
      capture_status: "capture_pending",
      provider_status: null,
      failure_reason_code: null,
      failure_reason_message: null,
    } satisfies IShoppingMallPaymentCapture.ICreate;

    const capture: IShoppingMallPaymentCapture =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
        connection,
        {
          paymentTransactionId: transaction.id,
          body: captureBody,
        },
      );
    typia.assert(capture);

    return { transaction, authorization, capture };
  };

  // Create two orders and associated payment flows
  const orderA: IShoppingMallOrder = await createOrder();
  const { transaction: txA, capture: captureA } =
    await createPaymentFlow(orderA);

  const orderB: IShoppingMallOrder = await createOrder();
  const { transaction: txB } = await createPaymentFlow(orderB);

  // 9. Attempt mismatched delete: use Tx B id with Capture A id
  const _adminReAuthForMismatch: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(_adminReAuthForMismatch);

  await TestValidator.error(
    "mismatched transaction and capture should fail deletion",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.erase(
        connection,
        {
          paymentTransactionId: txB.id,
          captureId: captureA.id,
        },
      );
    },
  );

  // 10. Correctly scoped delete should succeed: Tx A + Capture A
  const _adminReAuthForCorrectDelete: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(_adminReAuthForCorrectDelete);

  await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.erase(
    connection,
    {
      paymentTransactionId: txA.id,
      captureId: captureA.id,
    },
  );
}
