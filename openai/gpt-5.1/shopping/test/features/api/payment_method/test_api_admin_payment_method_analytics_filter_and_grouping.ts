import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodAnalytics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
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
import type { IShoppingMallPaymentMethodAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodAnalytics";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_payment_method_analytics_filter_and_grouping(
  connection: api.IConnection,
) {
  /**
   * Validate admin payment method analytics filtering, grouping, and sorting.
   *
   * Business workflow covered by this E2E test:
   *
   * 1. Admin joins and logs in to obtain an admin-authenticated connection.
   * 2. Admin creates two payment methods, with business codes "card" and
   *    "bank_transfer" that will be referenced in analytics filters.
   * 3. Admin creates a country and a region which will be used for customer
   *    shipping addresses and regional analytics filtering.
   * 4. A seller joins and logs in, then creates a product and two SKUs.
   * 5. Two customers join and log in. Each customer:
   *
   *    - Creates a shipping address bound to the created country/region,
   *    - Creates a cart,
   *    - Places an order that uses one of the SKUs and one of the payment methods,
   *         and
   *    - Creates a logical order payment using the corresponding payment_method_id.
   *         One customer/order will conceptually represent an "earlier" payment
   *         segment and the other a "later" segment within the same [from, to)
   *         range. Because the backend decides timestamps, we treat both as
   *         falling within a shared day bucket (granularity "day"), and we
   *         distinguish segments by payment method and paid amount in
   *         assertions, not by hard-coded clock times.
   * 6. With the admin-authenticated connection, the test calls PATCH
   *    /shoppingMall/admin/analytics/paymentMethods/stats with a body that:
   *
   *    - Sets from/to to a wide window covering now,
   *    - Filters paymentMethodCodes to ["card", "bank_transfer"],
   *    - Supplies regionCodes including the created region.code,
   *    - Sets groupBy to ["paymentMethod", "date", "region"], and
   *    - Sets granularity to "day".
   * 7. The test asserts that the response contains analytics rows for both payment
   *    methods within the window and region, and that for each method the
   *    paid_gmv_amount is at least the amount of the created order using that
   *    method. Since other data may exist in the environment, we only assert
   *    lower bounds and method membership, not exact totals.
   * 8. The test issues a second PATCH request with minTotalAmount set above the
   *    smaller of the two known order amounts. It then verifies that at least
   *    one analytics row remains, and that every remaining row's
   *    paid_gmv_amount is greater than or equal to that threshold, effectively
   *    excluding the lower-amount segment.
   * 9. Finally, the test issues a third PATCH request with sortBy set to
   *    "totalAmount" (modeled as paid_gmv_amount in assertions) and
   *    sortDirection "asc" and validates that the resulting analytics rows are
   *    ordered in non-decreasing paid_gmv_amount.
   */

  // Helper to create a random but valid email and password pair.
  const randomAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const randomSellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const randomCustomer1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const randomCustomer2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customer1Password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customer2Password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  // Common href/referrer used for all join/login flows.
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // 1. Admin joins and logs in.
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: randomAdminEmail,
      password: adminPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // Ensure admin token is applied to connection automatically by SDK.
  TestValidator.predicate(
    "admin join should return token",
    adminJoin.token.access.length > 0,
  );

  // Explicit admin login to ensure login path also works and token is refreshed.
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: randomAdminEmail,
      password: adminPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 2. Admin creates two payment methods: "card" and "bank_transfer".
  const cardPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Card payments",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(cardPaymentMethod);

  const bankTransferPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "bank_transfer",
        display_name: "Bank Transfer",
        description: "Bank transfer payments",
        provider_type: "bank_gateway",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(bankTransferPaymentMethod);

  // 3. Admin creates a country and a region.
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: countryCode,
        name_en: `Country ${countryCode}`,
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const regionCode = RandomGenerator.alphabets(4).toUpperCase();

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: regionCode,
          name_en: `Region ${regionCode}`,
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 4. Seller joins, logs in, and creates product + two SKUs.
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: randomSellerEmail,
      password: sellerPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: randomSellerEmail,
      password: sellerPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: `P-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "BrandX",
        model_name: "ModelY",
        status: "active",
        primary_image_uri: typia.random<
          string & tags.Format<"uri">
        >() as string & tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  const skuPriceCard = 100;
  const skuPriceBank = 200;

  const skuInventoryStateId = typia.random<string & tags.Format<"uuid">>();

  const skuCard = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `SKU-CARD-${RandomGenerator.alphaNumeric(6)}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: skuPriceCard,
        original_price: skuPriceCard,
        inventory_quantity: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        low_stock_threshold: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: skuInventoryStateId,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(skuCard);

  const skuBank = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `SKU-BANK-${RandomGenerator.alphaNumeric(6)}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: skuPriceBank,
        original_price: skuPriceBank,
        inventory_quantity: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        low_stock_threshold: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: skuInventoryStateId,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(skuBank);

  // 5. Two customers join/login, create addresses, carts, orders, and payments.
  const customer1Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: randomCustomer1Email,
      password: customer1Password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer1Join);

  const customer1Login = await api.functional.auth.customer.login(connection, {
    body: {
      email: randomCustomer1Email,
      password: customer1Password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer1Login);

  const customer1Address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer1Login.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(),
          line1: RandomGenerator.paragraph({ sentences: 3 }),
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customer1Address);

  const customer1Cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(customer1Cart);

  const order1 = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: customer1Cart.id,
        currency_code: "KRW",
        items: [
          {
            shopping_mall_sku_id: skuCard.id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: customer1Address.id,
        shipping_address_snapshot: null,
        shipping_method_id: null,
        payment_method_id: cardPaymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order1);

  const payment1 =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order1.id,
        body: {
          payment_method_id: cardPaymentMethod.id,
          currency_code: order1.currency_code,
          payable_amount: skuPriceCard,
          provider_reference: null,
          provider_status_code: null,
          metadata: null,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(payment1);

  const customer2Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: randomCustomer2Email,
      password: customer2Password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer2Join);

  const customer2Login = await api.functional.auth.customer.login(connection, {
    body: {
      email: randomCustomer2Email,
      password: customer2Password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer2Login);

  const customer2Address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer2Login.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(),
          line1: RandomGenerator.paragraph({ sentences: 3 }),
          line2: null,
          city: "Seoul",
          postal_code: "54321",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customer2Address);

  const customer2Cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(customer2Cart);

  const order2 = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: customer2Cart.id,
        currency_code: "KRW",
        items: [
          {
            shopping_mall_sku_id: skuBank.id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: customer2Address.id,
        shipping_address_snapshot: null,
        shipping_method_id: null,
        payment_method_id: bankTransferPaymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order2);

  const payment2 =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order2.id,
        body: {
          payment_method_id: bankTransferPaymentMethod.id,
          currency_code: order2.currency_code,
          payable_amount: skuPriceBank,
          provider_reference: null,
          provider_status_code: null,
          metadata: null,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(payment2);

  // Switch back to admin context by logging in again.
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: {
      email: randomAdminEmail,
      password: adminPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

  // 6. Call analytics with broad filters to include both payments.
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const toDate = new Date(now.getTime() + 1000 * 60 * 60 * 24);

  const fromIso = fromDate.toISOString() as string & tags.Format<"date-time">;
  const toIso = toDate.toISOString() as string & tags.Format<"date-time">;

  const analyticsRequestCommon: IShoppingMallPaymentMethodAnalytics.IRequest = {
    from: fromIso,
    to: toIso,
    paymentMethodCodes: [
      cardPaymentMethod.code,
      bankTransferPaymentMethod.code,
    ],
    regionCodes: [region.code],
    groupBy: ["paymentMethod", "date", "region"],
    granularity: "day",
    minTotalAmount: undefined,
    maxTotalAmount: undefined,
    includeRefunds: true,
    includeChargebacks: true,
    sortBy: undefined,
    sortDirection: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const page1 =
    await api.functional.shoppingMall.admin.analytics.paymentMethods.stats.index(
      connection,
      {
        body: analyticsRequestCommon,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodAnalytics.ISummary>(page1);

  const rows1 = page1.data;

  TestValidator.predicate(
    "analytics should return at least one row",
    rows1.length > 0,
  );

  const hasCardRow = rows1.some(
    (row) => row.payment_method_code === cardPaymentMethod.code,
  );
  const hasBankRow = rows1.some(
    (row) => row.payment_method_code === bankTransferPaymentMethod.code,
  );

  TestValidator.predicate(
    "analytics should include card payment method row",
    hasCardRow,
  );
  TestValidator.predicate(
    "analytics should include bank_transfer payment method row",
    hasBankRow,
  );

  const cardRows = rows1.filter(
    (row) => row.payment_method_code === cardPaymentMethod.code,
  );
  const bankRows = rows1.filter(
    (row) => row.payment_method_code === bankTransferPaymentMethod.code,
  );

  const cardTotalGmv = cardRows.reduce(
    (sum, row) => sum + row.paid_gmv_amount,
    0,
  );
  const bankTotalGmv = bankRows.reduce(
    (sum, row) => sum + row.paid_gmv_amount,
    0,
  );

  TestValidator.predicate(
    "card GMV should be at least the card order amount",
    cardTotalGmv >= skuPriceCard,
  );
  TestValidator.predicate(
    "bank_transfer GMV should be at least the bank order amount",
    bankTotalGmv >= skuPriceBank,
  );

  // 8. Call analytics with minTotalAmount above smaller GMV threshold.
  const smallerKnownGmv = Math.min(skuPriceCard, skuPriceBank);
  const threshold = smallerKnownGmv + 0.5;

  const analyticsRequestWithMin: IShoppingMallPaymentMethodAnalytics.IRequest =
    {
      ...analyticsRequestCommon,
      minTotalAmount: threshold,
    };

  const page2 =
    await api.functional.shoppingMall.admin.analytics.paymentMethods.stats.index(
      connection,
      {
        body: analyticsRequestWithMin,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodAnalytics.ISummary>(page2);

  const rows2 = page2.data;

  TestValidator.predicate(
    "analytics with minTotalAmount should still return rows (at least one high GMV method)",
    rows2.length > 0,
  );

  for (const row of rows2) {
    TestValidator.predicate(
      "each row's GMV should be >= minTotalAmount threshold",
      row.paid_gmv_amount >= threshold,
    );
  }

  // 9. Call analytics with sortBy totalAmount ascending and validate ordering.
  const analyticsRequestSorted: IShoppingMallPaymentMethodAnalytics.IRequest = {
    ...analyticsRequestCommon,
    sortBy: "totalAmount",
    sortDirection: "asc",
  };

  const page3 =
    await api.functional.shoppingMall.admin.analytics.paymentMethods.stats.index(
      connection,
      {
        body: analyticsRequestSorted,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodAnalytics.ISummary>(page3);

  const rows3 = page3.data;

  if (rows3.length > 1) {
    for (let i = 1; i < rows3.length; i++) {
      const prev = rows3[i - 1];
      const curr = rows3[i];
      TestValidator.predicate(
        "rows should be sorted by paid_gmv_amount ascending when sortBy=totalAmount,sortDirection=asc",
        prev.paid_gmv_amount <= curr.paid_gmv_amount,
      );
    }
  }
}
