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
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
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

export async function test_api_platform_admin_view_chargeback_not_found(
  connection: api.IConnection,
) {
  // 1. Prepare a platform admin account via join so that we have a valid
  //    platformAdmin actor and Authorization header for subsequent calls.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. (Optional) Create some background payment data so the environment
  //    realistically contains at least one chargeback. This is not strictly
  //    required for the not-found behavior but makes the scenario more
  //    realistic. We will keep it minimal to avoid flakiness.
  //
  // 2-1. Register a brand and a product under the admin (using platformAdmin
  //      product create path to avoid needing a seller context).
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
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

  // 2-2. Create a platform-level payment method that could theoretically be
  //      used by transactions.
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
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

  // 2-3. Create a dummy customer + cart + order to support the transaction and
  //      chargeback records. This is only for background realism; the not-found
  //      path does not depend on these exact entities.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

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

  // For the cart item, we need some SKU id. Since we do not control seller
  // context easily and we do not need the order for our primary assertion,
  // we will skip creating cart items and orders to avoid brittle coupling.
  // This keeps the test focused on the not-found behavior of chargeback GET.

  // 2-4. Create a fake payment transaction and a chargeback so that at least
  //      one valid chargeback exists.
  const orderId = typia.random<string & tags.Format<"uuid">>();

  const transactionBody = {
    orderId,
    customerId: customer.customer.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: "test-gateway",
    providerTransactionId: null,
    currency: "USD" as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: 100,
    capturedAmount: 100,
    paymentStatus: "payment_captured",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const transaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: transactionBody },
    );
  typia.assert(transaction);

  const chargebackBody = {
    paymentTransactionId: transaction.id,
    orderId: transaction.orderId,
    caseReference: `CB-${RandomGenerator.alphaNumeric(10)}`,
    providerCaseId: undefined,
    disputedAmount: 100,
    currency: transaction.currency,
    status: "chargeback_open",
    reasonCode: "test_reason",
    reasonMessage: undefined,
    openedAt: new Date().toISOString(),
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const existingChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      { body: chargebackBody },
    );
  typia.assert(existingChargeback);

  // 3. Generate a random UUID that is extremely unlikely to match any existing
  //    chargeback ID. We do not try to confirm uniqueness via a list API.
  const nonexistentChargebackId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // To reduce the tiny chance of collision with our just-created chargeback,
  // if we happen to generate the same id (in simulation mode), regenerate once.
  if (nonexistentChargebackId === existingChargeback.id) {
    const regeneratedId: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    // We do not loop infinitely; a single regeneration is enough to reduce
    // collision probability to effectively zero for this test.
    const safeId: string & tags.Format<"uuid"> = regeneratedId;
    await TestValidator.error(
      "platform admin viewing non-existent chargeback should fail (regenerated id)",
      async () => {
        await api.functional.shoppingMall.platformAdmin.paymentChargebacks.at(
          connection,
          { chargebackId: safeId },
        );
      },
    );
  } else {
    // 4. Attempt to fetch the nonexistent chargeback and assert that it fails.
    await TestValidator.error(
      "platform admin viewing non-existent chargeback should fail",
      async () => {
        await api.functional.shoppingMall.platformAdmin.paymentChargebacks.at(
          connection,
          { chargebackId: nonexistentChargebackId },
        );
      },
    );

    // 5. Call again with the same nonexistent id to confirm consistent
    //    not-found behavior and ensure no side-effectful creation.
    await TestValidator.error(
      "repeated view of same non-existent chargeback should still fail",
      async () => {
        await api.functional.shoppingMall.platformAdmin.paymentChargebacks.at(
          connection,
          { chargebackId: nonexistentChargebackId },
        );
      },
    );
  }
}
