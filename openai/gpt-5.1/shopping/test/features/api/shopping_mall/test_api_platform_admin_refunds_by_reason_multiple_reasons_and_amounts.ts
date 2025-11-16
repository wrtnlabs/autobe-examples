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
import type { IShoppingMallRefundReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundReasonStatistics";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that refunds-by-reason statistics correctly aggregate counts and
 * totals across multiple orders and multiple refunds per reason.
 *
 * End-to-end flow:
 *
 * 1. Register and authenticate a platform admin, seller, and customer.
 * 2. As platform admin, create a category tree and a brand.
 * 3. As platform admin, create a product owned by the seller, flagged as
 *    multi-SKU.
 * 4. As seller, define an option type and a single option value for that product.
 * 5. As platform admin, create a SKU for the product.
 * 6. As customer, create two carts, add the SKU as items, and create two orders (A
 *    and B).
 * 7. As platform admin, create a payment method and payment transactions for both
 *    orders.
 * 8. As platform admin/internal, create three refund transactions:
 *
 *    - Refund 1: Order A, reason_category="R1", amount X.
 *    - Refund 2: Order B, reason_category="R2", amount Y.
 *    - Refund 3: Order B, reason_category="R1", amount Z.
 * 9. As platform admin, call refunds-by-reason statistics endpoint.
 * 10. Assert that:
 *
 * - Buckets exist for reasons "R1" and "R2".
 * - R1.refundCount == 2 and totalRefundAmount == X + Z.
 * - R2.refundCount == 1 and totalRefundAmount == Y.
 * - Overall.totalRefundCount == 3 and totalRefundAmount == X + Y + Z.
 */
export async function test_api_platform_admin_refunds_by_reason_multiple_reasons_and_amounts(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // Ensure we can also login (join already sets token, but we validate login flow)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminAfterLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 2. Register and authenticate seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
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
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterLogin);

  // 3. Register and authenticate customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "nestjs-e2e-test/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterLogin);

  // 4. As platform admin, create category tree
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
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 5. As platform admin, create brand
  const brandBody = {
    name: RandomGenerator.name(1),
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 6. As platform admin, create product owned by seller
  const productCode: string & tags.MinLength<1> =
    `PROD-${RandomGenerator.alphaNumeric(8)}` as string & tags.MinLength<1>;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
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

  // 7. As seller, create option type for the product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 8. As seller, create option value
  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 9. As platform admin, create SKU for product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(6)}`;
  const skuBody = {
    code: skuCode,
    name: `Variant ${optionValue.value}`,
    listPrice: 10000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // Helper to create a cart, add item, and create order
  const createOrderFromCart = async (): Promise<IShoppingMallOrder> => {
    // create cart
    const cartBody = {
      currency_code: "KRW",
      region_code: "KR-SEOUL",
      channel: "web",
      metadata: undefined,
      is_active: true,
      source_guest_token: undefined,
    } satisfies IShoppingMallCustomerCart.ICreate;
    const cart: IShoppingMallCustomerCart =
      await api.functional.shoppingMall.customer.customerCarts.create(
        connection,
        { body: cartBody },
      );
    typia.assert(cart);

    // add item
    const cartItemBody = {
      skuId: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: null,
    } satisfies IShoppingMallCustomerCartItem.ICreate;
    const cartItem: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id as string & tags.Format<"uuid">,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);

    // create order based on cart; we use consistent snapshot totals
    const itemsSubtotal = 10000;
    const discountTotal = 0;
    const shippingTotal = 0;
    const taxTotal = 0;
    const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

    const orderCreateBody = {
      customer_cart_id: cart.id as string & tags.Format<"uuid">,
      currency_code: cart.currency_code,
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: "",
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(order);
    return order;
  };

  // 10. Create two orders A and B as customer
  const orderA: IShoppingMallOrder = await createOrderFromCart();
  const orderB: IShoppingMallOrder = await createOrderFromCart();

  // 11. As platform admin, create a payment method
  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(6)}`;
  const now = new Date();
  const later = new Date(now.getTime() + 1000 * 60 * 60 * 24);
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "Test payment method for refunds-by-reason stats",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: now.toISOString(),
    ends_at: later.toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 12. As platform admin, create payment transactions for both orders
  const makePaymentTransaction = async (
    order: IShoppingMallOrder,
  ): Promise<IShoppingMallPaymentTransaction> => {
    const paymentTxBody = {
      orderId: order.id,
      customerId: order.customer.id,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
      providerName: "test-gateway",
      providerTransactionId: `tx-${RandomGenerator.alphaNumeric(10)}`,
      currency: order.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: order.grand_total_amount,
      capturedAmount: order.grand_total_amount,
      paymentStatus: "payment_captured",
      providerStatus: "captured",
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const paymentTx: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        { body: paymentTxBody },
      );
    typia.assert(paymentTx);
    return paymentTx;
  };

  const paymentA = await makePaymentTransaction(orderA);
  const paymentB = await makePaymentTransaction(orderB);

  // 13. Create three refund transactions with R1/R2 reasons
  const amountX = 1000;
  const amountY = 2000;
  const amountZ = 3000;

  const makeRefund = async (
    paymentTx: IShoppingMallPaymentTransaction,
    order: IShoppingMallOrder,
    reasonCategory: string,
    amount: number,
  ): Promise<IShoppingMallRefundTransaction> => {
    const refundBody = {
      shopping_mall_payment_transaction_id: paymentTx.id,
      shopping_mall_order_id: order.id,
      refund_number: `RF-${RandomGenerator.alphaNumeric(8)}`,
      refund_status: "refund_completed",
      actor_type: "admin",
      reason_category: reasonCategory,
      reason_message: `Reason ${reasonCategory}`,
      requested_amount: amount,
      approved_amount: amount,
      refunded_amount: amount,
      currency: paymentTx.currency,
      provider_refund_id: `pr-${RandomGenerator.alphaNumeric(8)}`,
      provider_status: "completed",
      failure_reason_code: null,
      failure_reason_message: null,
    } satisfies IShoppingMallRefundTransaction.ICreate;

    const refund: IShoppingMallRefundTransaction =
      await api.functional.shoppingMall.refundTransactions.create(connection, {
        body: refundBody,
      });
    typia.assert(refund);
    return refund;
  };

  const refund1 = await makeRefund(paymentA, orderA, "R1", amountX);
  const refund2 = await makeRefund(paymentB, orderB, "R2", amountY);
  const refund3 = await makeRefund(paymentB, orderB, "R1", amountZ);

  typia.assert(refund1);
  typia.assert(refund2);
  typia.assert(refund3);

  // 14. Call refunds-by-reason statistics as platform admin
  const stats: IShoppingMallRefundReasonStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.refunds_by_reason.index(
      connection,
    );
  typia.assert(stats);

  // 15. Validate buckets and overall aggregation
  const bucketR1 = stats.buckets.find((b) => b.reasonCode === "R1");
  const bucketR2 = stats.buckets.find((b) => b.reasonCode === "R2");

  TestValidator.predicate("bucket for R1 should exist", bucketR1 !== undefined);
  TestValidator.predicate("bucket for R2 should exist", bucketR2 !== undefined);

  if (bucketR1 !== undefined) {
    TestValidator.equals("R1 refundCount should be 2", bucketR1.refundCount, 2);
    TestValidator.equals(
      "R1 totalRefundAmount should equal X + Z",
      bucketR1.totalRefundAmount,
      amountX + amountZ,
    );
  }

  if (bucketR2 !== undefined) {
    TestValidator.equals("R2 refundCount should be 1", bucketR2.refundCount, 1);
    TestValidator.equals(
      "R2 totalRefundAmount should equal Y",
      bucketR2.totalRefundAmount,
      amountY,
    );
  }

  TestValidator.equals(
    "overall totalRefundCount should equal 3",
    stats.overall.totalRefundCount,
    3,
  );
  TestValidator.equals(
    "overall totalRefundAmount should equal X + Y + Z",
    stats.overall.totalRefundAmount,
    amountX + amountY + amountZ,
  );
}
