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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * List and filter order payments for a customer order with pagination.
 *
 * Business flow:
 *
 * 1. Create admin, seller, and customer actors via auth join APIs and keep their
 *    emails/passwords for later logins.
 * 2. As admin, configure core catalog and logistics data:
 *
 *    - A country and a region under it.
 *    - A shipping method.
 *    - A payment method.
 *    - A product category.
 * 3. As seller, create a product, assign the category, create a skuInventoryState,
 *    then create a SKU for the product with that inventory state.
 * 4. As customer, create a cart, add a cart item for the SKU, create a customer
 *    address, and then create an order that references the cart and
 *    shipping/address/payment configs.
 * 5. As customer, create multiple logical payments for the order with different
 *    payable_amount values so that there are at least two payments available
 *    for listing.
 * 6. Invoke PATCH /shoppingMall/customer/orders/{orderId}/payments multiple times
 *    with different IShoppingMallOrderPayment.IRequest bodies:
 *
 *    - First without businessStatuses filter to list all payments and pick a
 *         concrete business_status to use as filter value.
 *    - Second with businessStatuses set to a single picked status and a small limit
 *         to exercise pagination and verify that all returned entries share
 *         that status.
 *    - Optionally third with another existing status if available.
 * 7. Validate that:
 *
 *    - The unfiltered call returns a records count greater than or equal to the
 *         number of payments created for that order and that data.length never
 *         exceeds limit.
 *    - For the filtered call, all returned IShoppingMallOrderPayment.ISummary
 *         entries have business_status equal to the requested filter value.
 *    - Pagination metadata (current, limit, records, pages) behaves correctly when
 *         limit is set lower than the number of matching payments and data
 *         length aligns with requested limit or remaining records.
 * 8. Negative authorization check: create another customer with its own order and
 *    payments, then as the first customer call index for the other customer’s
 *    orderId and ensure this results in an error, proving that customers cannot
 *    see others’ payments.
 */
export async function test_api_customer_list_order_payments_with_filters(
  connection: api.IConnection,
) {
  // Create a base connection whose headers will be managed by SDK auth calls
  const base: api.IConnection = { ...connection, headers: {} };

  // 1. Register admin, seller, and customer actors
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(base, { body: adminJoinBody });
  typia.assert<IAuthorizationToken>(adminAuth.token);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(base, { body: sellerJoinBody });
  typia.assert(sellerAuth);

  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://marketing.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(base, { body: customerJoinBody });
  typia.assert(customerAuth);

  // 2. Admin config: login as admin and create country, region, shipping and payment methods, and category
  await api.functional.auth.admin.login(base, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://landing.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(base, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(base, {
      countryCode: country.country_code,
      body: regionBody,
    });
  typia.assert(region);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(base, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic credit card",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(base, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  const categoryBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronic devices",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(base, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller catalog: login as seller, create product, link category, inventory state, and SKU
  await api.functional.auth.seller.login(base, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://landing.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(base, {
      body: productBody,
    });
  typia.assert(product);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(base, {
      productId: product.id,
      body: productCategoryBody,
    });
  typia.assert(productCategory);

  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(base, {
      body: inventoryStateBody,
    });
  typia.assert(inventoryState);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(base, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer: login, create cart, add item, address, and order
  await api.functional.auth.customer.login(base, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://landing.example.com/",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(base, {
      body: cartBody,
    });
  typia.assert(cart);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(base, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Main St",
    line2: null,
    city: "Los Angeles",
    postal_code: "90001",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      base,
      {
        customerId: customerAuth.id,
        body: customerAddressBody,
      },
    );
  typia.assert(customerAddress);

  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  };

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32">,
  };

  const orderBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(base, {
      body: orderBody,
    });
  typia.assert(order);

  // 5. Create multiple logical payments for the order
  const paymentCreate1: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount / 2,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };
  const payment1: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(base, {
      orderId: order.id,
      body: paymentCreate1,
    });
  typia.assert(payment1);

  const paymentCreate2: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount / 2,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };
  const payment2: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(base, {
      orderId: order.id,
      body: paymentCreate2,
    });
  typia.assert(payment2);

  const allPayments: IShoppingMallOrderPayment[] = [payment1, payment2];

  // 6. Unfiltered index call to collect actual statuses
  const requestAll: IShoppingMallOrderPayment.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderIds: undefined,
    paymentMethodIds: undefined,
    businessStatuses: undefined,
    currencyCodes: undefined,
    minPayableAmount: undefined,
    maxPayableAmount: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  };
  const pageAll: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.customer.orders.payments.index(base, {
      orderId: order.id,
      body: requestAll,
    });
  typia.assert(pageAll);

  TestValidator.predicate(
    "unfiltered payments data length does not exceed limit",
    pageAll.data.length <= pageAll.pagination.limit,
  );

  TestValidator.predicate(
    "unfiltered records should be at least number of created payments",
    pageAll.pagination.records >= allPayments.length,
  );

  TestValidator.predicate(
    "unfiltered pages metadata is consistent",
    pageAll.pagination.pages ===
      (pageAll.pagination.records === 0
        ? 0
        : Math.ceil(pageAll.pagination.records / pageAll.pagination.limit)),
  );

  // Derive an existing business_status to use for filter testing, if any
  const statusForFilter: string | undefined =
    pageAll.data.length > 0 ? pageAll.data[0]?.business_status : undefined;

  if (statusForFilter !== undefined) {
    // 6a. Filter by the derived business_status with small limit
    const requestFiltered: IShoppingMallOrderPayment.IRequest = {
      page: 1 as number & tags.Type<"int32">,
      limit: 1 as number & tags.Type<"int32">,
      orderIds: undefined,
      paymentMethodIds: undefined,
      businessStatuses: [statusForFilter],
      currencyCodes: undefined,
      minPayableAmount: undefined,
      maxPayableAmount: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      sortBy: undefined,
      sortDirection: undefined,
    };
    const pageFiltered: IPageIShoppingMallOrderPayment.ISummary =
      await api.functional.shoppingMall.customer.orders.payments.index(base, {
        orderId: order.id,
        body: requestFiltered,
      });
    typia.assert(pageFiltered);

    TestValidator.predicate(
      "filtered data length does not exceed limit",
      pageFiltered.data.length <= pageFiltered.pagination.limit,
    );

    await ArrayUtil.asyncForEach(pageFiltered.data, async (summary) => {
      TestValidator.equals(
        "filtered payments have expected business_status",
        summary.business_status,
        statusForFilter,
      );
    });

    TestValidator.predicate(
      "filtered pages metadata is consistent",
      pageFiltered.pagination.pages ===
        (pageFiltered.pagination.records === 0
          ? 0
          : Math.ceil(
              pageFiltered.pagination.records / pageFiltered.pagination.limit,
            )),
    );
  }

  // 8. Cross-customer isolation: second customer and order; first customer should not see payments
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const otherJoinBody = {
    email: otherCustomerEmail,
    password: otherCustomerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://marketing.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const otherCustomerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(base, { body: otherJoinBody });
  typia.assert(otherCustomerAuth);

  await api.functional.auth.customer.login(base, {
    body: {
      email: otherCustomerEmail,
      password: otherCustomerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://landing.example.com/",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const otherCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(base, {
      body: cartBody,
    });
  typia.assert(otherCart);

  const otherCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(base, {
      cartId: otherCart.id,
      body: cartItemBody,
    });
  typia.assert(otherCartItem);

  const otherAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      base,
      {
        customerId: otherCustomerAuth.id,
        body: customerAddressBody,
      },
    );
  typia.assert(otherAddress);

  const otherShippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: otherAddress.recipient_name,
    phone_number: otherAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: otherAddress.postal_code,
    state_or_region: region.name_en,
    city: otherAddress.city,
    address_line1: otherAddress.line1,
    address_line2: otherAddress.line2 ?? null,
  };

  const otherOrderBody: IShoppingMallOrder.ICreate = {
    cart_id: otherCart.id,
    currency_code: "USD",
    items: [orderItemCreate],
    shipping_address_id: otherAddress.id,
    shipping_address_snapshot: otherShippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const otherOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(base, {
      body: otherOrderBody,
    });
  typia.assert(otherOrder);

  const otherPaymentCreate: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: otherOrder.currency_code,
    payable_amount: otherOrder.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };
  const otherPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(base, {
      orderId: otherOrder.id,
      body: otherPaymentCreate,
    });
  typia.assert(otherPayment);

  // Switch back to first customer
  await api.functional.auth.customer.login(base, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://landing.example.com/",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  await TestValidator.error(
    "customer must not view payments of other customers' orders",
    async () => {
      await api.functional.shoppingMall.customer.orders.payments.index(base, {
        orderId: otherOrder.id,
        body: requestAll,
      });
    },
  );
}
