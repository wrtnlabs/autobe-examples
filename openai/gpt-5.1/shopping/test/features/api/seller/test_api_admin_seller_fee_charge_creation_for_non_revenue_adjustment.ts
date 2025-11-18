import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerFeeCharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeCharge";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_seller_fee_charge_creation_for_non_revenue_adjustment(
  connection: api.IConnection,
) {
  /**
   * Validate creating a non-revenue seller fee adjustment charge.
   *
   * Business flow (happy path only, without verifying read-back by id because
   * there is no GET /shoppingMall/admin/sellerFeeCharges/{id} API in the SDK):
   *
   * 1. Admin joins (auth.admin.join) to obtain admin Authentication.
   * 2. Seller joins (auth.seller.join) to obtain a seller account and id.
   * 3. Customer joins (auth.customer.join) to place an order.
   * 4. Admin configures country and region.
   * 5. Customer creates a shipping address using that country/region.
   * 6. Seller registers a product.
   * 7. Admin creates a SKU inventory state; seller registers a SKU for product.
   * 8. Customer creates a cart header (minimal usage, order built directly).
   * 9. Customer creates an order with one line item for that SKU, referencing the
   *    shipping address (by snapshot) and dummy shipping/payment refs.
   * 10. Admin creates a payment method; customer creates an order payment linked to
   *     the order.
   * 11. Admin creates a seller earning for that seller, order, and payment.
   * 12. Admin creates a seller fee charge with isPlatformRevenue = false, negative
   *     amount to represent a credit/adjustment, and an effective date in the
   *     present.
   * 13. Assert that the created fee charge references correct seller/order, has the
   *     requested amounts, currency, and flags.
   * 14. Optionally attempt to create a fee charge as seller or customer and expect
   *     authorization failure using TestValidator.error.
   */

  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Keep admin email/password for re-login if we need to restore context
  const adminEmail = adminJoinBody.email;
  const adminPassword = adminJoinBody.password;

  // 2. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);
  const sellerId = sellerAuthorized.id;

  const sellerEmail = sellerJoinBody.email;
  const sellerPassword = sellerJoinBody.password;

  // 3. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);
  const customerId = customerAuthorized.id;

  const customerEmail = customerJoinBody.email;
  const customerPassword = customerJoinBody.password;

  // 4. Admin creates country
  // Ensure admin auth is active (join already set token on connection)
  const countryBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 5. Admin creates region under that country
  const regionBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 6. Customer creates shipping address using country/region
  // Switch authentication to customer
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAuthorizedAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedAgain);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 7. Seller registers a product
  // Switch to seller auth
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/home",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedAgain);

  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBE Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(4),
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 8. Admin creates a category and links product to category
  // Switch back to admin auth
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedAgain);

  const categoryBody = {
    parent_id: null,
    slug: "autobe-test-category-" + RandomGenerator.alphaNumeric(6),
    name_en: "AutoBE Test Category",
    description_en: "Category for AutoBE e2e tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 9. Admin creates SKU inventory state
  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Inventory available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 10. Seller creates a SKU for the product
  // Switch back to seller auth
  const sellerAuthorizedThird: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedThird);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: 12000,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 11. Customer creates a cart (header only, order is built directly)
  const customerAuthorizedThird: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedThird);

  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 12. Customer creates an order with one item for that SKU
  const shippingAddressSnapshotBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotBody,
    shipping_method_id: null,
    payment_method_id: null,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 13. Admin creates payment method
  const adminAuthorizedThird: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedThird);

  const paymentMethodBody = {
    code: "autobe-test-method-" + RandomGenerator.alphaNumeric(4),
    display_name: "AutoBE Test Payment Method",
    description: "Payment method for AutoBE tests",
    provider_type: "test_gateway",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 14. Customer creates an order payment
  const customerAuthorizedFourth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedFourth);

  const payableAmount = order.grand_total_amount;

  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 15. Admin creates a seller earning for that seller, order, payment
  const adminAuthorizedFourth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedFourth);

  const grossAmount = payableAmount;
  const sellerDiscountAmount = 0;
  const platformDiscountAmount = 0;
  const commissionAmount = Math.round(grossAmount * 0.1 * 100) / 100;
  const otherFeeAmount = 0;
  const netEarningAmount =
    grossAmount - commissionAmount - sellerDiscountAmount - otherFeeAmount;

  const earningBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: order.items[0]?.id ?? null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: grossAmount,
    seller_discount_amount: sellerDiscountAmount,
    platform_discount_amount: platformDiscountAmount,
    commission_amount: commissionAmount,
    other_fee_amount: otherFeeAmount,
    net_earning_amount: netEarningAmount,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: new Date().toISOString() as string & tags.Format<"date-time">,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: earningBody,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(earning);

  // 16. Admin creates a non-revenue seller fee charge with negative amount
  const adjustmentAmount = -5000; // credit back to seller
  const adjustmentTaxAmount = 0;
  const effectiveDate = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const feeChargeBody = {
    sellerId,
    orderId: order.id,
    paymentRefundId: null,
    sellerPayoutItemId: null,
    feeType: "adjustment",
    description: "Manual non-revenue adjustment credit for seller",
    currency: order.currency_code,
    amount: adjustmentAmount,
    taxAmount: adjustmentTaxAmount,
    isPlatformRevenue: false,
    effectiveDate,
  } satisfies IShoppingMallSellerFeeCharge.ICreate;

  const feeCharge: IShoppingMallSellerFeeCharge =
    await api.functional.shoppingMall.admin.sellerFeeCharges.create(
      connection,
      {
        body: feeChargeBody,
      },
    );
  typia.assert<IShoppingMallSellerFeeCharge>(feeCharge);

  // Business assertions on created feeCharge
  TestValidator.equals(
    "fee charge seller id matches",
    feeCharge.seller.id,
    sellerId,
  );

  TestValidator.equals(
    "fee charge order id matches",
    feeCharge.orderId,
    order.id,
  );

  TestValidator.equals(
    "fee charge currency matches order currency",
    feeCharge.currency,
    order.currency_code,
  );

  TestValidator.equals(
    "fee charge amount matches adjustment",
    feeCharge.amount,
    adjustmentAmount,
  );

  TestValidator.equals(
    "fee charge taxAmount matches",
    feeCharge.taxAmount,
    adjustmentTaxAmount,
  );

  TestValidator.equals(
    "fee charge isPlatformRevenue is false",
    feeCharge.isPlatformRevenue,
    false,
  );

  // Verify effectiveDate is a valid date-time and equals what we sent
  TestValidator.equals(
    "fee charge effectiveDate matches input",
    feeCharge.effectiveDate,
    effectiveDate,
  );

  // 17. Authorization negative test: seller should not be able to create fee charges
  const sellerUnauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const sellerAuthorizedFifth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(sellerUnauthorizedConnection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFifth);

  await TestValidator.error(
    "seller cannot create admin seller fee charge",
    async () => {
      await api.functional.shoppingMall.admin.sellerFeeCharges.create(
        sellerUnauthorizedConnection,
        {
          body: feeChargeBody,
        },
      );
    },
  );

  // 18. Authorization negative test: customer should not be able to create fee charges
  const customerUnauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const customerAuthorizedFifth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(customerUnauthorizedConnection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedFifth);

  await TestValidator.error(
    "customer cannot create admin seller fee charge",
    async () => {
      await api.functional.shoppingMall.admin.sellerFeeCharges.create(
        customerUnauthorizedConnection,
        {
          body: feeChargeBody,
        },
      );
    },
  );
}
