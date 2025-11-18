import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPayment";
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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_payment_search_filter_by_amount_and_currency(
  connection: api.IConnection,
) {
  // 1. Admin join (initial admin authentication)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Two customer joins
  const customer1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer1Password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customer2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer2Password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customer1JoinBody = {
    email: customer1Email,
    password: customer1Password,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer2JoinBody = {
    email: customer2Email,
    password: customer2Password,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer1Authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer1JoinBody,
    });
  typia.assert(customer1Authorized);

  const customer2Authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer2JoinBody,
    });
  typia.assert(customer2Authorized);

  // 4. As admin: configure geography, shipping, inventory state, payment method

  // 4.1 Country
  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 4.2 Region under the country
  const regionCreateBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4.3 SKU inventory state
  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Regular sellable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 4.4 Category
  const categoryCreateBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4.5 Shipping method
  const shippingMethodCreateBody = {
    method_code: `STD-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 4.6 Payment method (use currency_code "USD" for all payable_amounts)
  const paymentMethodCreateBody = {
    code: `CARD-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 5. As seller: create product and SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(6)}`,
    title: "Payment Test Product",
    summary: "Product for payment filtering tests",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Attach category as admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

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
  typia.assert(productCategory);

  // Switch back to seller to create SKU
  const sellerLoginAuthorized2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized2);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 50,
    original_price: 60,
    inventory_quantity: 100,
    low_stock_threshold: 10,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer addresses and carts/orders/payments
  const createCustomerAddressAndOrderWithPayments = async (
    customerEmail: string & tags.Format<"email">,
    customerPassword: string & tags.Format<"password">,
    band: "small" | "large",
  ) => {
    // login as customer
    const customerLoginBody = {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerLogin.IRequest;

    const customerAuthorizedLogin: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: customerLoginBody,
      });
    typia.assert(customerAuthorizedLogin);

    // create address
    const addressCreateBody = {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: RandomGenerator.name(),
      line1: "123 Test Street",
      line2: null,
      city: "Test City",
      postal_code: "12345",
      phone_number: RandomGenerator.mobile(),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate;

    const address: IShoppingMallCustomerAddress =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customerAuthorizedLogin.id,
          body: addressCreateBody,
        },
      );
    typia.assert(address);

    // create cart (customer actor)
    const cartCreateBody = {
      actor_type: "customer",
      status: "active",
      currency_code: "USD",
    } satisfies IShoppingMallCart.ICreate;

    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartCreateBody,
      });
    typia.assert(cart);

    // create order with one item referencing SKU
    const orderItemCreate: IShoppingMallOrderItem.ICreate = {
      shopping_mall_sku_id: sku.id,
      quantity: 1,
    };

    const shippingAddressSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate =
      {
        recipient_name: address.recipient_name,
        phone_number: address.phone_number ?? RandomGenerator.mobile(),
        country_code: country.country_code,
        postal_code: address.postal_code,
        state_or_region: region.name_en,
        city: address.city,
        address_line1: address.line1,
        address_line2: address.line2 ?? null,
      };

    const orderCreateBody = {
      cart_id: cart.id,
      currency_code: "USD",
      items: [orderItemCreate],
      shipping_address_id: address.id,
      shipping_address_snapshot: shippingAddressSnapshotCreate,
      shipping_method_id: shippingMethod.id,
      payment_method_id: paymentMethod.id,
      buyer_memo: null,
      platform_note: null,
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(order);

    // create two payments with different payable_amount ranges
    const paymentIds: (string & tags.Format<"uuid">)[] = [];

    const amounts: number[] = band === "small" ? [20, 40] : [200, 400];

    await ArrayUtil.asyncForEach(amounts, async (amount) => {
      const paymentCreateBody = {
        payment_method_id: paymentMethod.id,
        currency_code: "USD",
        payable_amount: amount,
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
      typia.assert(payment);
      paymentIds.push(payment.id as string & tags.Format<"uuid">);
    });

    return paymentIds;
  };

  // create small and large payments
  const smallPaymentIds = await createCustomerAddressAndOrderWithPayments(
    customer1Email,
    customer1Password,
    "small",
  );
  const largePaymentIds = await createCustomerAddressAndOrderWithPayments(
    customer2Email,
    customer2Password,
    "large",
  );

  // 7. As admin, search payments with high amount band
  const adminLoginAuthorized2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized2);

  const highBandRequestBody = {
    page: 1,
    limit: 50,
    orderIds: undefined,
    paymentMethodIds: undefined,
    businessStatuses: undefined,
    currencyCodes: ["USD"],
    minPayableAmount: 150,
    maxPayableAmount: 600,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderPayment.IRequest;

  const highBandPage: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.admin.payments.index(connection, {
      body: highBandRequestBody,
    });
  typia.assert(highBandPage);

  const highBandPayments = highBandPage.data;

  await ArrayUtil.asyncForEach(highBandPayments, async (p) => {
    TestValidator.equals(
      "high band currency must be USD",
      p.currency_code,
      "USD",
    );

    TestValidator.predicate(
      "high band amount within range",
      p.payable_amount >= (highBandRequestBody.minPayableAmount ?? 0) &&
        (highBandRequestBody.maxPayableAmount === undefined ||
          p.payable_amount <= highBandRequestBody.maxPayableAmount),
    );

    TestValidator.predicate(
      "high band should not include small payment ids",
      smallPaymentIds.includes(p.id as string & tags.Format<"uuid">) === false,
    );
  });

  const containsLargePayment = ArrayUtil.has(highBandPayments, (p) =>
    largePaymentIds.includes(p.id as string & tags.Format<"uuid">),
  );

  TestValidator.predicate(
    "high band results include at least one large payment",
    containsLargePayment,
  );

  // 8. As admin, search payments with low amount band
  const lowBandRequestBody = {
    page: 1,
    limit: 50,
    orderIds: undefined,
    paymentMethodIds: undefined,
    businessStatuses: undefined,
    currencyCodes: ["USD"],
    minPayableAmount: 0,
    maxPayableAmount: 100,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderPayment.IRequest;

  const lowBandPage: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.admin.payments.index(connection, {
      body: lowBandRequestBody,
    });
  typia.assert(lowBandPage);

  const lowBandPayments = lowBandPage.data;

  await ArrayUtil.asyncForEach(lowBandPayments, async (p) => {
    TestValidator.equals(
      "low band currency must be USD",
      p.currency_code,
      "USD",
    );

    TestValidator.predicate(
      "low band amount within range",
      p.payable_amount >= (lowBandRequestBody.minPayableAmount ?? 0) &&
        (lowBandRequestBody.maxPayableAmount === undefined ||
          p.payable_amount <= lowBandRequestBody.maxPayableAmount),
    );

    TestValidator.predicate(
      "low band should not include large payment ids",
      largePaymentIds.includes(p.id as string & tags.Format<"uuid">) === false,
    );
  });

  const containsSmallPayment = ArrayUtil.has(lowBandPayments, (p) =>
    smallPaymentIds.includes(p.id as string & tags.Format<"uuid">),
  );

  TestValidator.predicate(
    "low band results include at least one small payment",
    containsSmallPayment,
  );
}
