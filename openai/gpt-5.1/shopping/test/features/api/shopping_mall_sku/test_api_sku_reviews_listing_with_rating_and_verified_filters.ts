import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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

export async function test_api_sku_reviews_listing_with_rating_and_verified_filters(
  connection: api.IConnection,
) {
  // 1. Prepare shared constants and helpers
  const password = "Passw0rd!" as string & tags.Format<"password">;
  const href = "https://example.com/join" as string & tags.Format<"uri">;
  const referrer = "https://example.com/landing" as string & tags.Format<"uri">;

  // Helper to build random email
  const randomEmail = () =>
    `${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;

  // 2. Create admin and configure master data (country, region, shipping, payment, sku inventory)
  const adminEmail = randomEmail();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // switch to admin login explicitly to ensure auth works
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // country
  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    { body: countryCreateBody },
  );
  typia.assert<IShoppingMallCountry>(country);

  // region under country
  const regionCreateBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // shipping method
  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // payment method
  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard credit card",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // SKU inventory state (purchasable)
  const skuInventoryCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryCreateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 3. Create seller and product + SKU
  const sellerEmail = randomEmail();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. Create two customers
  const createCustomer = async () => {
    const email = randomEmail();
    const joinRes = await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        ip: null,
        href,
        referrer,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(joinRes);

    const loginRes = await api.functional.auth.customer.login(connection, {
      body: {
        email,
        password,
        ip: null,
        href,
        referrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(loginRes);

    return loginRes;
  };

  const customer1 = await createCustomer();
  const customer2 = await createCustomer();

  // helper to create address for a customer
  const createAddress = async (
    customer: IShoppingMallCustomer.IAuthorized,
  ): Promise<IShoppingMallCustomerAddress> => {
    const loginRes = await api.functional.auth.customer.login(connection, {
      body: {
        email: customer.email,
        password,
        ip: null,
        href,
        referrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(loginRes);

    const addressBody = {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: RandomGenerator.name(2),
      line1: "123 Test Street",
      line2: null,
      city: "Test City",
      postal_code: "12345",
      phone_number: RandomGenerator.mobile(),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate;
    const address =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customer.id,
          body: addressBody,
        },
      );
    typia.assert<IShoppingMallCustomerAddress>(address);
    return address;
  };

  const customer1Address = await createAddress(customer1);
  const customer2Address = await createAddress(customer2);

  // 5. Helper to place order and payment for a customer
  const placeOrderForCustomer = async (
    customer: IShoppingMallCustomer.IAuthorized,
    address: IShoppingMallCustomerAddress,
    rating: number,
  ) => {
    // ensure customer is logged in
    const loginRes = await api.functional.auth.customer.login(connection, {
      body: {
        email: customer.email,
        password,
        ip: null,
        href,
        referrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(loginRes);

    // create cart
    const cartBody = {
      actor_type: "customer",
      status: "active",
      currency_code:
        productCreateBody.default_locale === "en-US" ? "USD" : "USD",
    } satisfies IShoppingMallCart.ICreate;
    const cart = await api.functional.shoppingMall.customer.carts.create(
      connection,
      { body: cartBody },
    );
    typia.assert<IShoppingMallCart>(cart);

    // add SKU to cart
    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;
    const cartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: cartItemBody,
        },
      );
    typia.assert<IShoppingMallCartItem>(cartItem);

    // create order from cart
    const orderBody = {
      cart_id: cart.id,
      currency_code: cart.currency_code,
      items: [
        {
          shopping_mall_sku_id: sku.id,
          quantity: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallOrderItem.ICreate,
      ],
      shipping_address_id: address.id,
      shipping_address_snapshot: null,
      shipping_method_id: shippingMethod.id,
      payment_method_id: paymentMethod.id,
      buyer_memo: null,
      platform_note: null,
    } satisfies IShoppingMallOrder.ICreate;
    const order = await api.functional.shoppingMall.customer.orders.create(
      connection,
      { body: orderBody },
    );
    typia.assert<IShoppingMallOrder>(order);

    // create payment
    const paymentBody = {
      payment_method_id: paymentMethod.id,
      currency_code: order.currency_code,
      payable_amount: order.grand_total_amount,
      provider_reference: null,
      provider_status_code: null,
      metadata: null,
    } satisfies IShoppingMallOrderPayment.ICreate;
    const orderPayment =
      await api.functional.shoppingMall.customer.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: paymentBody,
        },
      );
    typia.assert<IShoppingMallOrderPayment>(orderPayment);

    // create a verified review for the SKU with the given rating
    const reviewBody = {
      rating: rating as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>,
      title: `Rating ${rating}`,
      body: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies IShoppingMallReview.ICreate;
    const review =
      await api.functional.shoppingMall.customer.skus.reviews.create(
        connection,
        {
          skuId: sku.id,
          body: reviewBody,
        },
      );
    typia.assert<IShoppingMallReview>(review);
    TestValidator.equals(
      "verified review should be marked as verified_purchase",
      review.verified_purchase,
      true,
    );
    return review;
  };

  // Create verified reviews with different ratings
  const verifiedReviewLow = await placeOrderForCustomer(
    customer1,
    customer1Address,
    2,
  );
  const verifiedReviewHigh1 = await placeOrderForCustomer(
    customer1,
    customer1Address,
    4,
  );
  const verifiedReviewHigh2 = await placeOrderForCustomer(
    customer2,
    customer2Address,
    5,
  );

  // 6. Optionally create a non-verified review: we rely on SKU review create, but
  // the backend decides verified_purchase. We do not have a separate non-verified
  // path, so we will just create an additional review without order linkage by
  // calling the same endpoint again; business logic may mark it non-verified
  const loginCustomer2 = await api.functional.auth.customer.login(connection, {
    body: {
      email: customer2.email,
      password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(loginCustomer2);

  const maybeNonVerifiedBody = {
    rating: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Maybe non-verified",
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallReview.ICreate;
  const maybeNonVerifiedReview =
    await api.functional.shoppingMall.customer.skus.reviews.create(connection, {
      skuId: sku.id,
      body: maybeNonVerifiedBody,
    });
  typia.assert<IShoppingMallReview>(maybeNonVerifiedReview);

  // 7. Now test PATCH /shoppingMall/skus/{skuId}/reviews filters

  // Helper to assert ratings within range and verified flag as expected
  const assertRangeAndVerified = (
    label: string,
    page: IPageIShoppingMallReview.ISummary,
    minRating: number,
    maxRating: number,
    verifiedOnly: boolean,
  ) => {
    typia.assert<IPageIShoppingMallReview.ISummary>(page);
    for (const summary of page.data) {
      TestValidator.predicate(
        `${label}: rating within range`,
        summary.rating >= minRating && summary.rating <= maxRating,
      );
      if (verifiedOnly) {
        TestValidator.equals(
          `${label}: verified_purchase true`,
          summary.verified_purchase,
          true,
        );
      }
    }
  };

  // 7-1. Filter: rating 4-5, verified only
  const highVerifiedRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    max_rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: true,
    incentivized_only: null,
    sort_by: "rating" as const,
    sort_direction: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;
  const highVerifiedPage = await api.functional.shoppingMall.skus.reviews.index(
    connection,
    {
      skuId: sku.id,
      body: highVerifiedRequest,
    },
  );
  typia.assert<IPageIShoppingMallReview.ISummary>(highVerifiedPage);
  assertRangeAndVerified("high verified", highVerifiedPage, 4, 5, true);

  // ensure high-rated verified reviews are present
  const highVerifiedIds = highVerifiedPage.data.map((r) => r.id);
  TestValidator.predicate(
    "verified high rating review 1 present",
    highVerifiedIds.includes(verifiedReviewHigh1.id),
  );
  TestValidator.predicate(
    "verified high rating review 2 present",
    highVerifiedIds.includes(verifiedReviewHigh2.id),
  );

  // 7-2. Filter: rating 1-3, verified only
  const lowVerifiedRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    max_rating: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: true,
    incentivized_only: null,
    sort_by: "rating" as const,
    sort_direction: "asc" as const,
  } satisfies IShoppingMallReview.IRequest;
  const lowVerifiedPage = await api.functional.shoppingMall.skus.reviews.index(
    connection,
    {
      skuId: sku.id,
      body: lowVerifiedRequest,
    },
  );
  typia.assert<IPageIShoppingMallReview.ISummary>(lowVerifiedPage);
  assertRangeAndVerified("low verified", lowVerifiedPage, 1, 3, true);

  const lowVerifiedIds = lowVerifiedPage.data.map((r) => r.id);
  TestValidator.predicate(
    "verified low rating review present",
    lowVerifiedIds.includes(verifiedReviewLow.id),
  );

  // 7-3. Filter: rating 1-5, verified_purchase_only = null (include both)
  const allMixedRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    max_rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: null,
    incentivized_only: null,
    sort_by: "created_at" as const,
    sort_direction: "asc" as const,
  } satisfies IShoppingMallReview.IRequest;
  const allMixedPage = await api.functional.shoppingMall.skus.reviews.index(
    connection,
    {
      skuId: sku.id,
      body: allMixedRequest,
    },
  );
  typia.assert<IPageIShoppingMallReview.ISummary>(allMixedPage);

  // assert ratings within full range and ordering by created_at asc
  assertRangeAndVerified("all mixed", allMixedPage, 1, 5, false);
  for (let i = 1; i < allMixedPage.data.length; i++) {
    const prev = allMixedPage.data[i - 1];
    const curr = allMixedPage.data[i];
    TestValidator.predicate(
      "created_at ascending",
      prev.created_at <= curr.created_at,
    );
  }

  const allIds = allMixedPage.data.map((r) => r.id);
  TestValidator.predicate(
    "all mixed contains at least one verified review",
    allIds.includes(verifiedReviewHigh1.id) ||
      allIds.includes(verifiedReviewLow.id),
  );

  // We cannot guarantee business logic sets verified_purchase=false for the
  // additional review, so we only assert it exists in the full listing.
  TestValidator.predicate(
    "all mixed includes extra review",
    allIds.includes(maybeNonVerifiedReview.id),
  );

  // 7-4. Pagination test: use limit=2 on high verified filter
  const paginatedRequestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    min_rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    max_rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: true,
    incentivized_only: null,
    sort_by: "rating" as const,
    sort_direction: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;
  const page1 = await api.functional.shoppingMall.skus.reviews.index(
    connection,
    {
      skuId: sku.id,
      body: paginatedRequestPage1,
    },
  );
  typia.assert<IPageIShoppingMallReview.ISummary>(page1);

  TestValidator.equals("pagination limit is 2", page1.pagination.limit, 2);
  TestValidator.predicate("at least one page", page1.pagination.pages >= 1);

  if (page1.pagination.pages >= 2) {
    const paginatedRequestPage2 = {
      ...paginatedRequestPage1,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallReview.IRequest;
    const page2 = await api.functional.shoppingMall.skus.reviews.index(
      connection,
      {
        skuId: sku.id,
        body: paginatedRequestPage2,
      },
    );
    typia.assert<IPageIShoppingMallReview.ISummary>(page2);

    const ids1 = page1.data.map((r) => r.id);
    const ids2 = page2.data.map((r) => r.id);

    TestValidator.predicate(
      "page1 and page2 should be disjoint",
      ids1.every((id) => !ids2.includes(id)),
    );
  }

  // 7-5. Ordering by rating desc in highVerifiedPage already ensured non-increasing
  for (let i = 1; i < highVerifiedPage.data.length; i++) {
    const prev = highVerifiedPage.data[i - 1];
    const curr = highVerifiedPage.data[i];
    TestValidator.predicate("rating desc ordering", prev.rating >= curr.rating);
  }
}
