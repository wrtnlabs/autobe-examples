import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerEarning";
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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_seller_earnings_index_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate core actors: seller A, seller B, customer, admin
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
        ip: null,
        href: "https://seller.example.com/join",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(sellerAJoin);

  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
        ip: null,
        href: "https://seller.example.com/join",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(sellerBJoin);

  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: typia.random<
          (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">) | null
        >(),
        href: "https://customer.example.com/join",
        referrer: "https://customer.example.com/landing",
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(customerJoin);

  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: typia.random<
          (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">) | null
        >(),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminJoin);

  // 2. Admin: create country, region, shipping method, payment method, inventory state, category
  const countryCode = "KR";
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: countryCode,
        name_en: "Korea",
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert(country);

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: {
          code: "SEOUL",
          name_en: "Seoul",
          region_type: "city",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "STANDARD",
        display_name: "Standard Shipping",
        service_level_description: "Standard delivery",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "CARD",
        display_name: "Credit Card",
        description: "Generic card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "Available for purchase",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphabets(8),
        name_en: "General",
        description_en: "General category",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Seller A: create product and SKU
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "BrandA",
        model_name: "Model1",
        status: "active",
        primary_image_uri: "https://img.example.com/product.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        code: RandomGenerator.alphaNumeric(6) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: RandomGenerator.alphaNumeric(12),
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: 120,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 1 as
          | (number & tags.Type<"int32"> & tags.Minimum<0>)
          | null
          | undefined,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // Link product to category (admin)
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 4. Customer: create cart, add item, address, and order
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoin.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: "Address line 1",
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(customerAddress);

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        cart_id: cart.id,
        currency_code: cart.currency_code,
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: customerAddress.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Customer: create payment for order
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method_id: paymentMethod.id,
          currency_code: order.currency_code,
          payable_amount: order.grand_total_amount,
          provider_reference: null,
          provider_status_code: null,
          metadata: null,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(orderPayment);

  // 6. Admin: create earnings for seller A and seller B
  const earningCurrency = order.currency_code;

  const createEarningForSeller = async (
    sellerId: string,
    gross: number,
    commission: number,
    net: number,
  ): Promise<IShoppingMallSellerEarning> => {
    const earning: IShoppingMallSellerEarning =
      await api.functional.shoppingMall.admin.sellers.earnings.create(
        connection,
        {
          sellerId,
          body: {
            shopping_mall_order_id: order.id,
            shopping_mall_order_item_id: order.items[0]?.id ?? null,
            shopping_mall_order_payment_id: orderPayment.id,
            currency_code: earningCurrency,
            gross_amount: gross,
            seller_discount_amount: 0,
            platform_discount_amount: 0,
            commission_amount: commission,
            other_fee_amount: 0,
            net_earning_amount: net,
            earning_type: "order_item",
            business_status: "eligible",
            eligible_at: new Date().toISOString(),
            reversed_at: null,
            metadata: null,
          } satisfies IShoppingMallSellerEarning.ICreate,
        },
      );
    typia.assert(earning);
    return earning;
  };

  const sellerAEarning1 = await createEarningForSeller(
    sellerAJoin.id,
    10000,
    1000,
    9000,
  );
  const sellerAEarning2 = await createEarningForSeller(
    sellerAJoin.id,
    20000,
    2000,
    18000,
  );
  const sellerAEarning3 = await createEarningForSeller(
    sellerAJoin.id,
    30000,
    3000,
    27000,
  );

  const sellerBEarning = await createEarningForSeller(
    sellerBJoin.id,
    5000,
    500,
    4500,
  );

  const sellerAEarningIds: string[] = [
    sellerAEarning1.id,
    sellerAEarning2.id,
    sellerAEarning3.id,
  ];

  // 7. Seller A: login explicitly to ensure seller context
  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerALogin);

  // 8. Call earnings.index with pagination: page 1, limit 1
  const page1Body = {
    page: 1 as number & tags.Type<"int32">,
    limit: 1 as number & tags.Type<"int32">,
    sellerId: sellerAJoin.id,
    earningTypes: undefined,
    businessStatuses: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    eligibleFrom: undefined,
    eligibleTo: undefined,
    reversedFrom: undefined,
    reversedTo: undefined,
    minNetEarningAmount: undefined,
    maxNetEarningAmount: undefined,
    currencyCodes: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallSellerEarning.IRequest;

  const page1: IPageIShoppingMallSellerEarning.ISummary =
    await api.functional.shoppingMall.seller.sellers.earnings.index(
      connection,
      {
        sellerId: sellerAJoin.id,
        body: page1Body,
      },
    );
  typia.assert(page1);

  TestValidator.equals(
    "page1 pagination.limit should be 1",
    page1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page1 pagination.current should be 1",
    page1.pagination.current,
    1,
  );

  const totalSellerAEarnings = sellerAEarningIds.length;
  TestValidator.equals(
    "page1 pagination.records should equal total seller A earnings",
    page1.pagination.records,
    totalSellerAEarnings,
  );

  const expectedPages = Math.ceil(
    totalSellerAEarnings / page1.pagination.limit,
  );
  TestValidator.equals(
    "page1 pagination.pages should be consistent with records and limit",
    page1.pagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "page1 data length should be <= limit",
    page1.data.length <= page1.pagination.limit,
  );

  await ArrayUtil.asyncForEach(page1.data, async (summary) => {
    TestValidator.equals(
      "page1 seller id must equal seller A",
      summary.seller.id,
      sellerAJoin.id,
    );
    TestValidator.notEquals(
      "page1 seller id must not equal seller B",
      summary.seller.id,
      sellerBJoin.id,
    );
  });

  // 9. Call earnings.index for page 2 (if exists) to check pagination order
  if (page1.pagination.pages >= 2) {
    const page2Body = {
      ...page1Body,
      page: 2 as number & tags.Type<"int32">,
    } satisfies IShoppingMallSellerEarning.IRequest;

    const page2: IPageIShoppingMallSellerEarning.ISummary =
      await api.functional.shoppingMall.seller.sellers.earnings.index(
        connection,
        {
          sellerId: sellerAJoin.id,
          body: page2Body,
        },
      );
    typia.assert(page2);

    TestValidator.equals(
      "page2 pagination.current should be 2",
      page2.pagination.current,
      2,
    );

    await ArrayUtil.asyncForEach(page2.data, async (summary) => {
      TestValidator.equals(
        "page2 seller id must equal seller A",
        summary.seller.id,
        sellerAJoin.id,
      );
      TestValidator.notEquals(
        "page2 seller id must not equal seller B",
        summary.seller.id,
        sellerBJoin.id,
      );
    });
  }

  // 10. Call earnings.index with larger limit to retrieve all seller A earnings
  const allBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sellerId: sellerAJoin.id,
    earningTypes: undefined,
    businessStatuses: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    eligibleFrom: undefined,
    eligibleTo: undefined,
    reversedFrom: undefined,
    reversedTo: undefined,
    minNetEarningAmount: undefined,
    maxNetEarningAmount: undefined,
    currencyCodes: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallSellerEarning.IRequest;

  const allPage: IPageIShoppingMallSellerEarning.ISummary =
    await api.functional.shoppingMall.seller.sellers.earnings.index(
      connection,
      {
        sellerId: sellerAJoin.id,
        body: allBody,
      },
    );
  typia.assert(allPage);

  TestValidator.equals(
    "allPage pagination.records should equal total seller A earnings",
    allPage.pagination.records,
    totalSellerAEarnings,
  );

  const returnedIds = allPage.data.map((d) => d.id);

  TestValidator.equals(
    "allPage must contain all seller A earning ids",
    returnedIds.sort(),
    [...sellerAEarningIds].sort(),
  );

  TestValidator.predicate(
    "allPage must not contain seller B earning id",
    returnedIds.includes(sellerBEarning.id) === false,
  );

  await ArrayUtil.asyncForEach(allPage.data, async (summary) => {
    TestValidator.equals(
      "allPage seller id must equal seller A",
      summary.seller.id,
      sellerAJoin.id,
    );
  });

  // 11. Validate one earning's monetary fields match creation
  const targetSummary = allPage.data.find((d) => d.id === sellerAEarning2.id);
  if (targetSummary) {
    TestValidator.equals(
      "currency_code should match earningCurrency",
      targetSummary.currency_code,
      earningCurrency,
    );
    TestValidator.equals(
      "gross_amount should match created value",
      targetSummary.gross_amount,
      sellerAEarning2.gross_amount,
    );
    TestValidator.equals(
      "commission_amount should match created value",
      targetSummary.commission_amount,
      sellerAEarning2.commission_amount,
    );
    TestValidator.equals(
      "net_earning_amount should match created value",
      targetSummary.net_earning_amount,
      sellerAEarning2.net_earning_amount,
    );
    TestValidator.equals(
      "business_status should match created value",
      targetSummary.business_status,
      sellerAEarning2.business_status,
    );
  }
}
