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

export async function test_api_seller_earnings_index_cross_seller_isolation(
  connection: api.IConnection,
) {
  // 1. Multi-actor setup: create admin, two sellers, one customer
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.join.example.com",
    referrer: "https://landing.example.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://sellerA.join.example.com",
    referrer: "https://landing.example.com",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://sellerB.join.example.com",
    referrer: "https://landing.example.com",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://customer.join.example.com",
    referrer: "https://landing.example.com",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Admin master data setup
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.login.example.com",
      referrer: "https://landing.example.com/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
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
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Pay by credit card",
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

  const skuInventoryStateCreateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Available",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  const categoryCreateBody = {
    parent_id: null,
    slug: "general",
    name_en: "General",
    description_en: "General products",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // Helper for product + sku per seller
  const createProductAndSkuForSeller = async (
    seller: IShoppingMallSeller.IAuthorized,
    password: string,
  ): Promise<{ product: IShoppingMallProduct; sku: IShoppingMallSku }> => {
    await api.functional.auth.seller.login(connection, {
      body: {
        email: seller.email,
        password,
        ip: null,
        href: "https://seller.login.example.com",
        referrer: "https://landing.example.com/seller/login",
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });

    const productBody = {
      code: RandomGenerator.alphaNumeric(8),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: "BrandX",
      model_name: "ModelY",
      status: "active",
      primary_image_uri: "https://img.example.com/product.jpg",
      default_locale: "en-US",
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productBody,
      });
    typia.assert<IShoppingMallProduct>(product);

    // link to category as admin
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminJoinBody.email,
        password: adminJoinBody.password,
        ip: null,
        href: "https://admin.login.example.com/products",
        referrer: "https://landing.example.com/admin/login",
      } satisfies IShoppingMallAdminLogin.ICreate,
    });

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

    // back to seller
    await api.functional.auth.seller.login(connection, {
      body: {
        email: seller.email,
        password,
        ip: null,
        href: "https://seller.login.example.com/sku",
        referrer: "https://landing.example.com/seller/login",
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });

    const skuBody = {
      code: RandomGenerator.alphaNumeric(8),
      barcode: null,
      status: "active",
      price: 10000,
      original_price: null,
      inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: null,
      shopping_mall_sku_inventory_state_id: skuInventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          body: skuBody,
        },
      );
    typia.assert<IShoppingMallSku>(sku);

    return { product, sku };
  };

  const { product: productA, sku: skuA } = await createProductAndSkuForSeller(
    sellerA,
    sellerAJoinBody.password,
  );
  const { product: productB, sku: skuB } = await createProductAndSkuForSeller(
    sellerB,
    sellerBJoinBody.password,
  );

  // 5. Customer order flows (two orders)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://customer.login.example.com",
      referrer: "https://landing.example.com/customer/login",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: "Address line 1",
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  const createOrderForSku = async (
    sku: IShoppingMallSku,
  ): Promise<{
    order: IShoppingMallOrder;
    orderItem: IShoppingMallOrderItem;
    orderPayment: IShoppingMallOrderPayment;
  }> => {
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

    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id as string & tags.Format<"uuid">,
          body: cartItemBody,
        },
      );
    typia.assert<IShoppingMallCartItem>(cartItem);

    const orderCreateBody = {
      cart_id: cart.id,
      currency_code: "KRW",
      items: [
        {
          shopping_mall_sku_id: sku.id,
          quantity: 1 as number & tags.Type<"int32">,
        },
      ] satisfies IShoppingMallOrderItem.ICreate[],
      shipping_address_id: address.id,
      shipping_address_snapshot: null,
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

    TestValidator.predicate(
      "order has at least one item",
      order.items.length > 0,
    );

    const orderItem: IShoppingMallOrderItem = order.items[0];

    const paymentCreateBody = {
      payment_method_id: paymentMethod.id,
      currency_code: order.currency_code,
      payable_amount: order.grand_total_amount,
      provider_reference: null,
      provider_status_code: null,
      metadata: null,
    } satisfies IShoppingMallOrderPayment.ICreate;

    const orderPayment: IShoppingMallOrderPayment =
      await api.functional.shoppingMall.customer.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: paymentCreateBody,
        },
      );
    typia.assert<IShoppingMallOrderPayment>(orderPayment);

    return { order, orderItem, orderPayment };
  };

  const {
    order: orderA,
    orderItem: orderItemA,
    orderPayment: orderPaymentA,
  } = await createOrderForSku(skuA);
  const {
    order: orderB,
    orderItem: orderItemB,
    orderPayment: orderPaymentB,
  } = await createOrderForSku(skuB);

  // 6. Admin creates earnings
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.login.example.com/earnings",
      referrer: "https://landing.example.com/admin/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const earningABody = {
    shopping_mall_order_id: orderA.id,
    shopping_mall_order_item_id: orderItemA.id,
    shopping_mall_order_payment_id: orderPaymentA.id,
    currency_code: orderA.currency_code,
    gross_amount: orderItemA.line_total,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: orderItemA.line_total * 0.1,
    other_fee_amount: 0,
    net_earning_amount: orderItemA.line_total * 0.9,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: orderA.placed_at,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earningA: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerA.id,
        body: earningABody,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(earningA);

  const earningBBody = {
    shopping_mall_order_id: orderB.id,
    shopping_mall_order_item_id: orderItemB.id,
    shopping_mall_order_payment_id: orderPaymentB.id,
    currency_code: orderB.currency_code,
    gross_amount: orderItemB.line_total,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: orderItemB.line_total * 0.2,
    other_fee_amount: 0,
    net_earning_amount: orderItemB.line_total * 0.8,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: orderB.placed_at,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earningB: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerB.id,
        body: earningBBody,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(earningB);

  // 7. Seller A earnings index
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAJoinBody.email,
      password: sellerAJoinBody.password,
      ip: null,
      href: "https://sellerA.login.example.com/earnings",
      referrer: "https://landing.example.com/seller/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const sellerARequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sellerId: undefined,
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

  const sellerAEarningsPage: IPageIShoppingMallSellerEarning.ISummary =
    await api.functional.shoppingMall.seller.sellers.earnings.index(
      connection,
      {
        sellerId: sellerA.id,
        body: sellerARequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerEarning.ISummary>(sellerAEarningsPage);

  TestValidator.predicate(
    "seller A has at least one earning",
    sellerAEarningsPage.data.length >= 1,
  );

  const sellerAEarningIds = sellerAEarningsPage.data.map((e) => e.id);
  TestValidator.predicate(
    "seller A earnings page contains earningA",
    sellerAEarningIds.includes(earningA.id),
  );

  sellerAEarningsPage.data.forEach((earning) => {
    TestValidator.equals(
      "each earning in seller A page belongs to seller A",
      earning.seller.id,
      sellerA.id,
    );
  });

  sellerAEarningsPage.data.forEach((earning) => {
    TestValidator.notEquals(
      "no seller B earning in seller A page",
      earning.seller.id,
      sellerB.id,
    );
  });

  // 8. Seller B earnings index
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBJoinBody.email,
      password: sellerBJoinBody.password,
      ip: null,
      href: "https://sellerB.login.example.com/earnings",
      referrer: "https://landing.example.com/seller/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const sellerBRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sellerId: undefined,
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

  const sellerBEarningsPage: IPageIShoppingMallSellerEarning.ISummary =
    await api.functional.shoppingMall.seller.sellers.earnings.index(
      connection,
      {
        sellerId: sellerB.id,
        body: sellerBRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerEarning.ISummary>(sellerBEarningsPage);

  TestValidator.predicate(
    "seller B has at least one earning",
    sellerBEarningsPage.data.length >= 1,
  );

  const sellerBEarningIds = sellerBEarningsPage.data.map((e) => e.id);
  TestValidator.predicate(
    "seller B earnings page contains earningB",
    sellerBEarningIds.includes(earningB.id),
  );

  sellerBEarningsPage.data.forEach((earning) => {
    TestValidator.equals(
      "each earning in seller B page belongs to seller B",
      earning.seller.id,
      sellerB.id,
    );
  });

  sellerBEarningsPage.data.forEach((earning) => {
    TestValidator.notEquals(
      "no seller A earning in seller B page",
      earning.seller.id,
      sellerA.id,
    );
  });

  // 9. Cross-seller access attempts
  // Seller A trying to access seller B earnings must fail
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAJoinBody.email,
      password: sellerAJoinBody.password,
      ip: null,
      href: "https://sellerA.login.example.com/earnings-cross",
      referrer: "https://landing.example.com/seller/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  await TestValidator.error(
    "seller A cannot access seller B earnings",
    async () => {
      await api.functional.shoppingMall.seller.sellers.earnings.index(
        connection,
        {
          sellerId: sellerB.id,
          body: sellerARequestBody,
        },
      );
    },
  );

  // Seller B trying to access seller A earnings must fail
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBJoinBody.email,
      password: sellerBJoinBody.password,
      ip: null,
      href: "https://sellerB.login.example.com/earnings-cross",
      referrer: "https://landing.example.com/seller/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  await TestValidator.error(
    "seller B cannot access seller A earnings",
    async () => {
      await api.functional.shoppingMall.seller.sellers.earnings.index(
        connection,
        {
          sellerId: sellerA.id,
          body: sellerBRequestBody,
        },
      );
    },
  );

  // 10. Optional: admin should not be able to call seller earnings index
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.login.example.com/earnings-seller",
      referrer: "https://landing.example.com/admin/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  await TestValidator.error(
    "admin cannot access seller earnings index",
    async () => {
      await api.functional.shoppingMall.seller.sellers.earnings.index(
        connection,
        {
          sellerId: sellerA.id,
          body: sellerARequestBody,
        },
      );
    },
  );
}
