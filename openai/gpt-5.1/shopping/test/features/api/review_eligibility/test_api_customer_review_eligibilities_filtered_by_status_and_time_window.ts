import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewEligibility";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewEligibility";
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

export async function test_api_customer_review_eligibilities_filtered_by_status_and_time_window(
  connection: api.IConnection,
) {
  // 1. Admin, seller, and customer setup
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. As admin, create country, region, category, shipping & payment methods, inventory state
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
  typia.assert<IShoppingMallCountry>(country);

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
  typia.assert<IShoppingMallRegion>(region);

  const categoryBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const shippingMethodBody = {
    method_code: `standard-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodBody = {
    code: `card-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Credit Card",
    description: "Credit card payment",
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
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const inventoryStateBody = {
    code: `in_stock-${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 3. As seller, create product, link category, create SKU
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Product",
    summary: "Test product summary",
    description: "Detailed description of test product",
    brand: "TestBrand",
    model_name: "Model1",
    status: "active",
    primary_image_uri: "https://example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

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

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 10000,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 4. As customer, create address and cart
  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: customerAddressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

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

  // 5. Create two orders to generate eligibilities (logical assumption)
  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number:
      customerAddress.phone_number !== null &&
      customerAddress.phone_number !== undefined
        ? customerAddress.phone_number
        : RandomGenerator.mobile("010"),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? undefined,
  };

  const orderItemBase: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  };

  const orderBodyA = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemBase],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBodyA,
    });
  typia.assert<IShoppingMallOrder>(orderA);

  const orderBodyB = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemBase],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Second order",
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBodyB,
    });
  typia.assert<IShoppingMallOrder>(orderB);

  // 6. Broad eligibility search for the customer
  const broadRequestBody: IShoppingMallReviewEligibility.IRequest = {
    customer_id: customerAuthorized.id,
    product_id: null,
    sku_id: null,
    order_item_id: null,
    status: null,
    eligible_from_from: null,
    eligible_from_to: null,
    eligible_until_from: null,
    eligible_until_to: null,
    page: 1,
    limit: 50,
    sort_by: null,
    sort_direction: null,
  };

  const broadPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.customers.reviewEligibilities.index(
      connection,
      {
        customerId: customerAuthorized.id,
        body: broadRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(broadPage);

  TestValidator.predicate(
    "broad eligibility search should return at least one record",
    broadPage.pagination.records > 0,
  );

  const eligibilities = broadPage.data;

  // We need at least two eligibilities to fully exercise exclusion; if not, we'll still test positive filtering.
  const hasAtLeastTwo = eligibilities.length >= 2;
  void hasAtLeastTwo; // kept only for reasoning; not strictly required later

  // Choose a target eligibility to derive filters
  const targetEligibility = eligibilities[0];
  if (!targetEligibility) return;

  const targetStatus: string = targetEligibility.status;
  const eligibleFrom = new Date(targetEligibility.eligible_from);
  const fromRange = new Date(
    eligibleFrom.getTime() - 5 * 60 * 1000,
  ).toISOString();
  const toRange = new Date(
    eligibleFrom.getTime() + 5 * 60 * 1000,
  ).toISOString();

  // Try to identify a contrasting eligibility to be excluded by filters
  const contrasting = eligibilities.find((e) => {
    if (e.id === targetEligibility.id) return false;
    if (e.status !== targetStatus) return true;
    const eFrom = Date.parse(e.eligible_from);
    const fromMs = Date.parse(fromRange);
    const toMs = Date.parse(toRange);
    return eFrom < fromMs || eFrom > toMs;
  });

  // 7. Filtered search by status and eligible_from window
  const filteredRequestBody: IShoppingMallReviewEligibility.IRequest = {
    customer_id: customerAuthorized.id,
    product_id: null,
    sku_id: null,
    order_item_id: null,
    status: targetStatus,
    eligible_from_from: fromRange,
    eligible_from_to: toRange,
    eligible_until_from: null,
    eligible_until_to: null,
    page: 1,
    limit: 50,
    sort_by: "eligible_from",
    sort_direction: "asc",
  };

  const filteredPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.customers.reviewEligibilities.index(
      connection,
      {
        customerId: customerAuthorized.id,
        body: filteredRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(filteredPage);

  const pagination: IPage.IPagination = filteredPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "filtered pagination current equals requested page",
    pagination.current,
    filteredRequestBody.page,
  );
  TestValidator.equals(
    "filtered pagination limit equals requested limit",
    pagination.limit,
    filteredRequestBody.limit,
  );

  // Validate all returned eligibilities match status and time window
  for (const e of filteredPage.data) {
    TestValidator.equals(
      "eligibility status should equal requested filter status",
      e.status,
      targetStatus,
    );

    const eFromMs = Date.parse(e.eligible_from);
    const fromMs = Date.parse(fromRange);
    const toMs = Date.parse(toRange);

    TestValidator.predicate(
      "eligibility eligible_from should be within requested range",
      eFromMs >= fromMs && eFromMs <= toMs,
    );
  }

  // If we found a contrasting eligibility, confirm it is absent in the filtered results
  if (contrasting) {
    const included = filteredPage.data.some((e) => e.id === contrasting.id);
    TestValidator.predicate(
      "contrasting eligibility should not appear in filtered results",
      included === false,
    );
  }

  // 8. Optional: change filters to see different subset (if there is at least one eligibility with different status)
  const otherStatusEligibility = eligibilities.find(
    (e) => e.status !== targetStatus,
  );

  if (otherStatusEligibility) {
    const otherStatus = otherStatusEligibility.status;
    const altRequestBody: IShoppingMallReviewEligibility.IRequest = {
      customer_id: customerAuthorized.id,
      product_id: null,
      sku_id: null,
      order_item_id: null,
      status: otherStatus,
      eligible_from_from: null,
      eligible_from_to: null,
      eligible_until_from: null,
      eligible_until_to: null,
      page: 1,
      limit: 50,
      sort_by: null,
      sort_direction: null,
    };

    const altPage: IPageIShoppingMallReviewEligibility.ISummary =
      await api.functional.shoppingMall.customer.customers.reviewEligibilities.index(
        connection,
        {
          customerId: customerAuthorized.id,
          body: altRequestBody,
        },
      );
    typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(altPage);

    for (const e of altPage.data) {
      TestValidator.equals(
        "eligibility status should equal alternate requested status",
        e.status,
        otherStatus,
      );
    }

    const anyTargetStatusInAlt = altPage.data.some(
      (e) => e.status === targetStatus,
    );
    TestValidator.predicate(
      "alternate status filter should not return original target status eligibilities",
      anyTargetStatusInAlt === false,
    );
  }
}
