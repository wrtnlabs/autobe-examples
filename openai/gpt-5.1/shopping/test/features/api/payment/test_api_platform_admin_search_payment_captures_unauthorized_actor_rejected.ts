import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentCapture";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_search_payment_captures_unauthorized_actor_rejected(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As platformAdmin, create a payment method to be used later
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_key: "test-provider",
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
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 3. Create catalog entities: brand, category tree (not directly needed by product but created for realism), product, and SKU
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const categoryTreeBody = {
    code: `tree_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: undefined,
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // Product must belong to a seller; we do not have seller creation APIs imported,
  // so we use a random UUID for shopping_mall_seller_id as allowed by the DTO.
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();

  const productCode = `prod_${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 4. Register and authenticate a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. As customer, create a cart and add one item for the SKU
  const customerCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
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

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
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

  // 6. As customer, create an order from the cart
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderGrandTotal = 80;

  const orderBody = {
    customer_cart_id: customerCart.id,
    currency_code: "USD",
    items_subtotal_amount: 80,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: orderGrandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver between 9-5",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Switch back to platformAdmin using login (to ensure we use login as well as join)
  const reloginAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(reloginAdmin);

  // 8. As platformAdmin, create a payment transaction for the order
  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: customerAuthorized.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "test-provider",
    providerTransactionId: null,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: 0,
    paymentStatus: "payment_authorized",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: null,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionCreateBody },
    );
  typia.assert(paymentTransaction);

  // 9. As platformAdmin, create at least one capture for the payment transaction
  const captureAmount = orderGrandTotal;

  const captureCreateBody = {
    shopping_mall_payment_authorization_id: null,
    provider_capture_id: null,
    amount: captureAmount,
    currency: paymentTransaction.currency,
    capture_status: "capture_succeeded",
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const capture: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: captureCreateBody,
      },
    );
  typia.assert(capture);

  // 10. As platformAdmin, verify that searching captures works (smoke test for success case)
  const searchRequest: IShoppingMallPaymentCapture.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: undefined,
    sortOrder: undefined,
    status: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    fromCapturedAt: undefined,
    toCapturedAt: undefined,
    gatewayReference: undefined,
  };

  const adminSearchResult: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: searchRequest,
      },
    );
  typia.assert(adminSearchResult);

  TestValidator.predicate(
    "platformAdmin search returns at least one capture",
    adminSearchResult.pagination.records >= 1,
  );

  // 11. Authenticate as customer again to simulate non-admin actor
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPass123!",
        ip: null,
        href: "https://shop.example.com/login",
        referrer: "https://shop.example.com/",
        userAgent: "e2e-test-agent",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert(customerLogin);

  // 12. As customer, attempt to search captures and expect authorization error
  await TestValidator.error(
    "customer actor cannot search payment captures",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
        connection,
        {
          paymentTransactionId: paymentTransaction.id,
          body: searchRequest,
        },
      );
    },
  );

  // 13. Create an unauthenticated connection (no headers) and assert it also cannot access the endpoint
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated actor cannot search payment captures",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
        unauthenticatedConnection,
        {
          paymentTransactionId: paymentTransaction.id,
          body: searchRequest,
        },
      );
    },
  );

  // 14. Finally, log back in as platformAdmin and confirm search still works, proving role-based control
  const finalAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        ip: null,
        href: "https://admin.example.com/login-final",
        referrer: "https://admin.example.com/",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(finalAdminLogin);

  const finalSearchResult: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: searchRequest,
      },
    );
  typia.assert(finalSearchResult);

  TestValidator.predicate(
    "platformAdmin search still returns at least one capture after unauthorized attempts",
    finalSearchResult.pagination.records >= 1,
  );
}
