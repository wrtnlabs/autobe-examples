import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
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

export async function test_api_customer_order_status_histories_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Create and authenticate actors: customer, seller, admin
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin: configure master data (country, region, category, inventory state, shipping method, payment method)
  const countryBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
    name_en: "General",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 3. Seller: create product and SKU
  // Switch auth to seller
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://img.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

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
  typia.assert(productCategory);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: 10,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer: create address and cart
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(address);

  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 5. Customer: create order with one item using the SKU and created address/shipping/payment
  const orderItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallOrderItem.ICreate;

  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
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
    currency_code: "KRW",
    items: [orderItemBody],
    shipping_address_id: address.id,
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
  typia.assert(order);

  const orderCode: string = order.order_code;

  // 6. Admin: create many status history entries (25) for this order
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
  typia.assert(adminLogin);

  const statusCycle = ["PENDING", "PAID", "SHIPPED", "DELIVERED"] as const;
  let previousStatus: string | null = null;
  const baseTime = new Date();

  const historyCount = 25;
  for (let i = 0; i < historyCount; i++) {
    const toStatus = statusCycle[i % statusCycle.length];
    const occurredAt = new Date(baseTime.getTime() + i * 60_000).toISOString();

    const historyBody = {
      from_status: previousStatus,
      to_status: toStatus,
      reason_code: null,
      reason_detail: null,
      occurred_at: occurredAt,
    } satisfies IShoppingMallOrderStatusHistory.ICreate;

    const history: IShoppingMallOrderStatusHistory =
      await api.functional.shoppingMall.admin.orders.statusHistories.create(
        connection,
        {
          orderCode,
          body: historyBody,
        },
      );
    typia.assert(history);
    previousStatus = toStatus;
  }

  // 7. Customer: query paginated status histories with different pages
  const PAGE_LIMIT = 10 as const;

  const page1Request = {
    page: 1,
    limit: PAGE_LIMIT,
  } satisfies IShoppingMallOrderStatusHistory.IRequest;

  const page1: IPageIShoppingMallOrderStatusHistory.ISummary =
    await api.functional.shoppingMall.customer.orders.statusHistories.index(
      connection,
      {
        orderCode,
        body: page1Request,
      },
    );
  typia.assert(page1);

  const page2Request = {
    page: 2,
    limit: PAGE_LIMIT,
  } satisfies IShoppingMallOrderStatusHistory.IRequest;

  const page2: IPageIShoppingMallOrderStatusHistory.ISummary =
    await api.functional.shoppingMall.customer.orders.statusHistories.index(
      connection,
      {
        orderCode,
        body: page2Request,
      },
    );
  typia.assert(page2);

  const page3Request = {
    page: 3,
    limit: PAGE_LIMIT,
  } satisfies IShoppingMallOrderStatusHistory.IRequest;

  const page3: IPageIShoppingMallOrderStatusHistory.ISummary =
    await api.functional.shoppingMall.customer.orders.statusHistories.index(
      connection,
      {
        orderCode,
        body: page3Request,
      },
    );
  typia.assert(page3);

  const page999Request = {
    page: 999,
    limit: PAGE_LIMIT,
  } satisfies IShoppingMallOrderStatusHistory.IRequest;

  const page999: IPageIShoppingMallOrderStatusHistory.ISummary =
    await api.functional.shoppingMall.customer.orders.statusHistories.index(
      connection,
      {
        orderCode,
        body: page999Request,
      },
    );
  typia.assert(page999);

  // 8. Assertions on pagination metadata and data distribution
  const pagination1 = page1.pagination;
  const pagination2 = page2.pagination;
  const pagination3 = page3.pagination;
  const pagination999 = page999.pagination;

  const totalRecords = pagination1.records;
  const expectedPages = Math.ceil(totalRecords / PAGE_LIMIT);

  TestValidator.equals("pagination current page 1", pagination1.current, 1);
  TestValidator.equals("pagination current page 2", pagination2.current, 2);
  TestValidator.equals("pagination current page 3", pagination3.current, 3);
  TestValidator.equals(
    "pagination current page 999",
    pagination999.current,
    999,
  );

  TestValidator.equals(
    "pagination limit consistency page1",
    pagination1.limit,
    PAGE_LIMIT,
  );
  TestValidator.equals(
    "pagination limit consistency page2",
    pagination2.limit,
    PAGE_LIMIT,
  );
  TestValidator.equals(
    "pagination limit consistency page3",
    pagination3.limit,
    PAGE_LIMIT,
  );
  TestValidator.equals(
    "pagination limit consistency page999",
    pagination999.limit,
    PAGE_LIMIT,
  );

  TestValidator.equals(
    "pagination records consistent page1-page2",
    pagination1.records,
    pagination2.records,
  );
  TestValidator.equals(
    "pagination records consistent page1-page3",
    pagination1.records,
    pagination3.records,
  );
  TestValidator.equals(
    "pagination records consistent page1-page999",
    pagination1.records,
    pagination999.records,
  );

  TestValidator.equals(
    "pagination pages consistent page1-page2",
    pagination1.pages,
    pagination2.pages,
  );
  TestValidator.equals(
    "pagination pages consistent page1-page3",
    pagination1.pages,
    pagination3.pages,
  );
  TestValidator.equals(
    "pagination pages consistent page1-page999",
    pagination1.pages,
    pagination999.pages,
  );

  TestValidator.equals(
    "pagination pages matches ceil(records/limit)",
    expectedPages,
    pagination1.pages,
  );

  // we created 25 history records, so expect records >= 25
  TestValidator.predicate(
    "total records is at least created historyCount",
    totalRecords >= historyCount,
  );

  // page sizes
  TestValidator.equals(
    "page1 data size",
    page1.data.length,
    Math.min(PAGE_LIMIT, totalRecords),
  );

  const expectedPage2Size =
    totalRecords > PAGE_LIMIT
      ? Math.min(PAGE_LIMIT, totalRecords - PAGE_LIMIT)
      : 0;
  TestValidator.equals("page2 data size", page2.data.length, expectedPage2Size);

  const expectedPage3Size =
    totalRecords > PAGE_LIMIT * 2
      ? Math.min(PAGE_LIMIT, totalRecords - PAGE_LIMIT * 2)
      : 0;
  TestValidator.equals("page3 data size", page3.data.length, expectedPage3Size);

  TestValidator.equals("page999 data size is 0", page999.data.length, 0);

  // Non-overlapping IDs across pages 1-3
  const ids1 = page1.data.map((h) => h.id);
  const ids2 = page2.data.map((h) => h.id);
  const ids3 = page3.data.map((h) => h.id);

  const set1 = new Set(ids1);
  const set2 = new Set(ids2);
  const set3 = new Set(ids3);

  const hasOverlap12 = ids2.some((id) => set1.has(id));
  const hasOverlap13 = ids3.some((id) => set1.has(id));
  const hasOverlap23 = ids3.some((id) => set2.has(id));

  TestValidator.predicate(
    "no overlap between page1 and page2",
    hasOverlap12 === false,
  );
  TestValidator.predicate(
    "no overlap between page1 and page3",
    hasOverlap13 === false,
  );
  TestValidator.predicate(
    "no overlap between page2 and page3",
    hasOverlap23 === false,
  );

  // Union of first 3 pages IDs equals expected combined count
  const unionIds = Array.from(new Set([...ids1, ...ids2, ...ids3]));
  const expectedUnionCount = Math.min(totalRecords, PAGE_LIMIT * 3);

  TestValidator.equals(
    "union of ids from pages 1-3 has expected size",
    unionIds.length,
    expectedUnionCount,
  );

  // Ordering validation: assume occurred_at descending (most recent first)
  const assertDescending = (
    title: string,
    data: IShoppingMallOrderStatusHistory.ISummary[],
  ) => {
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1].occurred_at;
      const curr = data[i].occurred_at;
      if (prev < curr) {
        throw new Error(
          `${title}: occurred_at not sorted descending at index ${i}`,
        );
      }
    }
  };

  assertDescending("page1 occurred_at ordering", page1.data);
  assertDescending("page2 occurred_at ordering", page2.data);
  assertDescending("page3 occurred_at ordering", page3.data);
}
