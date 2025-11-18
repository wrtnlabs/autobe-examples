import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import type { IShoppingMallSellerEarningsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsSummary";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_seller_earnings_summary_grouped_by_time_bucket(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in (single step via join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
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

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
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

  // 4. Static configuration as admin
  // Country
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // Region
  const regionCreateBody = {
    code: "R1",
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // Shipping method
  const shippingMethodCode = `ship_${RandomGenerator.alphaNumeric(6)}`;
  const shippingMethodCreateBody = {
    method_code: shippingMethodCode,
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method for testing",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // Payment method
  const paymentMethodCode = `pay_${RandomGenerator.alphaNumeric(6)}`;
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "Test payment method",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // SKU inventory state
  const inventoryStateCode = `state_${RandomGenerator.alphaNumeric(4)}`;
  const skuInventoryStateCreateBody = {
    code: inventoryStateCode,
    name: "In Stock",
    description: "Inventory state for in-stock SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 5. Catalog: product and SKU for seller
  // Authenticate as seller (login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // Create product as seller
  const productCreateBody = {
    code: `prod_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Switch back to admin to create a category and link it
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat_${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for testing seller earnings",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // Switch to seller again to create SKU
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin2);

  const skuCreateBody = {
    code: `sku_${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 6. Customer flow: create 3 orders for the SKU
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginAgain);

  const orders: IShoppingMallOrder[] = [];
  const payments: IShoppingMallOrderPayment[] = [];

  for (let i = 0; i < 3; i++) {
    // Cart
    const cartCreateBody = {
      actor_type: "customer",
      status: "active",
      currency_code: "USD",
    } satisfies IShoppingMallCart.ICreate;

    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartCreateBody,
      });
    typia.assert<IShoppingMallCart>(cart);

    // Cart item
    const cartItemCreateBody = {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: cartItemCreateBody,
        },
      );
    typia.assert<IShoppingMallCartItem>(cartItem);

    // Order
    const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
      {
        recipient_name: "Test Customer",
        phone_number: RandomGenerator.mobile(),
        country_code: country.country_code,
        postal_code: "12345",
        state_or_region: region.name_en,
        city: "Test City",
        address_line1: "123 Test St",
        address_line2: null,
      };

    const orderCreateBody = {
      cart_id: cart.id,
      currency_code: "USD",
      items: [
        {
          shopping_mall_sku_id: sku.id,
          quantity: 1 as number & tags.Type<"int32">,
        },
      ],
      shipping_address_id: null,
      shipping_address_snapshot: shippingAddressSnapshot,
      shipping_method_id: shippingMethod.id,
      payment_method_id: paymentMethod.id,
      buyer_memo: null,
      platform_note: null,
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert<IShoppingMallOrder>(order);

    // Payment
    const payableAmount = 100;

    const paymentCreateBody = {
      payment_method_id: paymentMethod.id,
      currency_code: order.currency_code,
      payable_amount: payableAmount,
      provider_reference: null,
      provider_status_code: null,
      metadata: null,
    } satisfies IShoppingMallOrderPayment.ICreate;

    const payment: IShoppingMallOrderPayment =
      await api.functional.shoppingMall.customer.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: paymentCreateBody,
        },
      );
    typia.assert<IShoppingMallOrderPayment>(payment);

    orders.push(order);
    payments.push(payment);
  }

  // 7. Create 3 seller earnings as admin
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

  const createdEarnings: IShoppingMallSellerEarning[] = [];

  for (let i = 0; i < 3; i++) {
    const gross = 100 * (i + 1);
    const sellerDiscount = 0;
    const platformDiscount = 0;
    const commission = 10 * (i + 1);
    const otherFee = 0;
    const net = gross - commission - sellerDiscount - otherFee;

    const earningCreateBody = {
      shopping_mall_order_id: orders[i].id,
      shopping_mall_order_item_id: orders[i].items[0]?.id ?? null,
      shopping_mall_order_payment_id: payments[i].id,
      currency_code: orders[i].currency_code as string &
        tags.MinLength<1> &
        tags.MaxLength<3>,
      gross_amount: gross,
      seller_discount_amount: sellerDiscount,
      platform_discount_amount: platformDiscount,
      commission_amount: commission,
      other_fee_amount: otherFee,
      net_earning_amount: net,
      earning_type: "order_item" as string & tags.MinLength<1>,
      business_status: "eligible" as string & tags.MinLength<1>,
      eligible_at: null,
      reversed_at: null,
      metadata: null,
    } satisfies IShoppingMallSellerEarning.ICreate;

    const earning: IShoppingMallSellerEarning =
      await api.functional.shoppingMall.admin.sellers.earnings.create(
        connection,
        {
          sellerId,
          body: earningCreateBody,
        },
      );
    typia.assert<IShoppingMallSellerEarning>(earning);

    createdEarnings.push(earning);
  }

  const totalGross = createdEarnings.reduce(
    (sum, e) => sum + e.gross_amount,
    0,
  );
  const totalNet = createdEarnings.reduce(
    (sum, e) => sum + e.net_earning_amount,
    0,
  );

  // 8. Call seller earnings summary with time-bucket grouping
  const now = new Date();
  const fromDate = new Date(now.getTime() - 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 60 * 60 * 1000);

  const summaryRequestBody = {
    fromDate: fromDate.toISOString() as string & tags.Format<"date-time">,
    toDate: toDate.toISOString() as string & tags.Format<"date-time">,
    businessStatuses: ["eligible"],
    sellerIds: [sellerId],
    groupBy: "timeBucket",
    currencyCode: undefined,
    minNetEarningAmount: undefined,
    maxNetEarningAmount: undefined,
    cursor: undefined,
  } satisfies IShoppingMallSellerEarningsSummary.IRequest;

  const summary: IShoppingMallSellerEarningsSummary =
    await api.functional.shoppingMall.admin.analytics.sellerEarnings.summary.index(
      connection,
      {
        body: summaryRequestBody,
      },
    );

  typia.assert<IShoppingMallSellerEarningsSummary>(summary);

  // 9. Assertions on overall totals
  TestValidator.equals(
    "total gross earnings should equal sum of created earnings",
    summary.totalGrossEarnings,
    totalGross,
  );

  TestValidator.equals(
    "total net earnings should equal sum of created earnings",
    summary.totalNetEarnings,
    totalNet,
  );

  TestValidator.equals(
    "earnings record count should be 3",
    summary.earningsRecordCount,
    3 as number & tags.Type<"int32">,
  );

  TestValidator.predicate(
    "order count should be at least 1",
    summary.orderCount >= 1,
  );

  // Validate byTimeBucket consistency if present
  if (summary.byTimeBucket && summary.byTimeBucket.length > 0) {
    const bucketNetTotal = summary.byTimeBucket.reduce(
      (sum, b) => sum + b.totalNetEarnings,
      0,
    );
    const bucketRecordCountTotal = summary.byTimeBucket.reduce(
      (sum, b) => sum + b.earningsRecordCount,
      0,
    );

    TestValidator.equals(
      "sum of byTimeBucket totalNetEarnings should match overall totalNetEarnings",
      bucketNetTotal,
      summary.totalNetEarnings,
    );

    TestValidator.equals(
      "sum of byTimeBucket earningsRecordCount should match overall earningsRecordCount",
      bucketRecordCountTotal,
      summary.earningsRecordCount,
    );

    for (const bucket of summary.byTimeBucket) {
      TestValidator.predicate(
        "bucket label should be non-empty",
        bucket.bucketLabel.length > 0,
      );

      const bucketStartDate = new Date(bucket.bucketStart);
      const bucketEndDate = new Date(bucket.bucketEnd);

      TestValidator.predicate(
        "bucket start should be before bucket end",
        bucketStartDate.getTime() < bucketEndDate.getTime(),
      );

      TestValidator.predicate(
        "bucket start should be within requested window",
        bucketStartDate.getTime() >= fromDate.getTime(),
      );

      TestValidator.predicate(
        "bucket end should be within requested window",
        bucketEndDate.getTime() <= toDate.getTime(),
      );
    }
  }

  // 10. Optional: verify a future-only window yields zero summary
  const futureFrom = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureTo = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const futureSummaryRequestBody = {
    fromDate: futureFrom.toISOString() as string & tags.Format<"date-time">,
    toDate: futureTo.toISOString() as string & tags.Format<"date-time">,
    businessStatuses: ["eligible"],
    sellerIds: [sellerId],
    groupBy: "timeBucket",
    currencyCode: undefined,
    minNetEarningAmount: undefined,
    maxNetEarningAmount: undefined,
    cursor: undefined,
  } satisfies IShoppingMallSellerEarningsSummary.IRequest;

  const futureSummary: IShoppingMallSellerEarningsSummary =
    await api.functional.shoppingMall.admin.analytics.sellerEarnings.summary.index(
      connection,
      {
        body: futureSummaryRequestBody,
      },
    );
  typia.assert<IShoppingMallSellerEarningsSummary>(futureSummary);

  TestValidator.equals(
    "future window should have zero totalGrossEarnings",
    futureSummary.totalGrossEarnings,
    0,
  );

  TestValidator.equals(
    "future window should have zero totalNetEarnings",
    futureSummary.totalNetEarnings,
    0,
  );

  TestValidator.equals(
    "future window should have zero earningsRecordCount",
    futureSummary.earningsRecordCount,
    0 as number & tags.Type<"int32">,
  );
}
