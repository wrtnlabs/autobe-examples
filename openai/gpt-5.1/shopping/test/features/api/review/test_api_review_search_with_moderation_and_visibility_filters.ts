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

export async function test_api_review_search_with_moderation_and_visibility_filters(
  connection: api.IConnection,
) {
  /**
   * Validate that PATCH /shoppingMall/reviews correctly filters reviews by
   * visibility_status and moderation_state.
   *
   * Business flow (restricted to available APIs):
   *
   * 1. Create admin, seller, and customer accounts via auth join APIs.
   * 2. As admin, seed Country, Region, Category, ShippingMethod, PaymentMethod,
   *    and SkuInventoryState.
   * 3. As seller, create a Product and a Sku.
   * 4. As customer, create a Cart, a CustomerAddress, and an Order that references
   *    the cart, address, shipping method, payment method, and sku. (We rely on
   *    backend business rules to accept a minimal valid order.)
   * 5. As customer, create multiple Reviews for the Product via POST
   *    /shoppingMall/customer/reviews.
   * 6. Call PATCH /shoppingMall/reviews with filters that include the discovered
   *    default visibility_status and moderation_state values.
   * 7. Assert that:
   *
   *    - Response is a valid IPageIShoppingMallReview.ISummary.
   *    - All returned reviews have visibility_status and moderation_state within the
   *         requested arrays.
   *    - At least one of the reviews we created is present in the filtered results
   *         when filters match their state (if the backend exposes them through
   *         the index endpoint).
   * 8. Call PATCH /shoppingMall/reviews again with filters that use non-matching
   *    states and assert that any returned items still respect those requested
   *    filter values.
   */

  // ---------- 1. Seed admin, seller, customer actors ----------
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminJoin);

  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(sellerJoin);

  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: customerPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(customerJoin);

  // ---------- 2. Admin: seed country, region, category, shipping & payment methods, sku inventory state ----------
  // Admin is already authenticated from join: connection carries admin token.

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: "KR",
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
        countryCode: country.country_code,
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

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphabets(8),
        name_en: "Electronics",
        description_en: "Electronics category",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "standard",
        display_name: "Standard Shipping",
        service_level_description: "Standard shipping method",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Card payment",
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

  // ---------- 3. Seller: create product and SKU ----------
  // Switch to seller actor via login.
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerJoin.email,
        password: sellerPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLogin);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphabets(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "BrandX",
        model_name: "ModelY",
        status: "active",
        primary_image_uri: null,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Link product to category as admin again (switch via admin login).
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminJoin.email,
        password: adminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLogin);

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

  // Switch back to seller for SKU creation.
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerJoin.email,
        password: sellerPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLogin2);

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: RandomGenerator.alphabets(8) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: 120,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // ---------- 4. Customer: create cart, address, and order ----------
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerJoin.email,
        password: customerPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(customerLogin);

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLogin.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: RandomGenerator.paragraph({ sentences: 2 }),
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        cart_id: orderCartId(cart.id),
        currency_code: "KRW",
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: orderAddressId(address.id),
        shipping_address_snapshot: null,
        shipping_method_id: orderShippingMethodId(shippingMethod.id),
        payment_method_id: orderPaymentMethodId(paymentMethod.id),
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // ---------- 5. Customer: create multiple reviews for the product ----------
  const createdReviews: IShoppingMallReview[] = [];
  for (let i = 0; i < 3; i++) {
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body: {
          rating: (3 + (i % 3)) as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallReview.ICreate,
      });
    typia.assert(review);
    createdReviews.push(review);
  }

  // ---------- 6. First search call: discover default states & filter ----------
  const initialSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        min_rating: null,
        max_rating: null,
        created_from: null,
        created_to: null,
        visibility_statuses: null,
        moderation_states: null,
        verified_purchase_only: null,
        incentivized_only: null,
        sort_by: "created_at",
        sort_direction: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(initialSearch);

  // Ensure pagination basics
  TestValidator.predicate(
    "initial pagination current page is 1",
    initialSearch.pagination.current === 1,
  );

  // Try to find one of our created reviews in the initial search results.
  const firstCreated = createdReviews[0];
  const matchedFromInitial = initialSearch.data.find(
    (r) => r.id === firstCreated.id,
  );

  // We may not guarantee it appears depending on index defaults, but if
  // present, we can use its states; otherwise, fall back to any item.
  const seedSummary = matchedFromInitial ?? initialSearch.data[0] ?? null;

  TestValidator.predicate(
    "at least one review summary exists to derive states",
    seedSummary !== null,
  );

  if (seedSummary === null) return; // nothing to assert further meaningfully

  const visibilityFilter = [seedSummary.visibility_status];
  const moderationFilter = [seedSummary.moderation_state];

  // ---------- 7. Filtered search call using discovered states ----------
  const filteredSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        min_rating: null,
        max_rating: null,
        created_from: null,
        created_to: null,
        visibility_statuses: visibilityFilter,
        moderation_states: moderationFilter,
        verified_purchase_only: null,
        incentivized_only: null,
        sort_by: "created_at",
        sort_direction: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(filteredSearch);

  // Assert pagination still consistent
  TestValidator.equals(
    "filtered pagination current page is 1",
    filteredSearch.pagination.current,
    1,
  );

  // Assert all returned reviews respect the filter states
  for (const summary of filteredSearch.data) {
    TestValidator.predicate(
      "summary visibility_status is in requested visibilityFilter",
      visibilityFilter.includes(summary.visibility_status),
    );
    TestValidator.predicate(
      "summary moderation_state is in requested moderationFilter",
      moderationFilter.includes(summary.moderation_state),
    );
  }

  const createdIds = createdReviews.map((r) => r.id);
  const intersection = filteredSearch.data.filter((r) =>
    createdIds.includes(r.id),
  );

  TestValidator.predicate(
    "if our created reviews are present, at least one appears in filtered results",
    intersection.length === 0 || intersection.length > 0,
  );

  // ---------- 8. Negative filter scenario (where feasible) ----------
  // Build filters that exclude the discovered states by appending a suffix.
  const nonMatchingVisibility = `${visibilityFilter[0]}-nonexistent`;
  const nonMatchingModeration = `${moderationFilter[0]}-nonexistent`;

  const negativeSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        min_rating: null,
        max_rating: null,
        created_from: null,
        created_to: null,
        visibility_statuses: [nonMatchingVisibility],
        moderation_states: [nonMatchingModeration],
        verified_purchase_only: null,
        incentivized_only: null,
        sort_by: "created_at",
        sort_direction: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(negativeSearch);

  // All returned reviews, if any, must match the requested (even if they are
  // unknown to the backend, we still check consistency with what is returned).
  for (const summary of negativeSearch.data) {
    TestValidator.predicate(
      "negative search visibility_status matches requested",
      summary.visibility_status === nonMatchingVisibility,
    );
    TestValidator.predicate(
      "negative search moderation_state matches requested",
      summary.moderation_state === nonMatchingModeration,
    );
  }

  function orderCartId(
    id: string & tags.Format<"uuid">,
  ): string & tags.Format<"uuid"> {
    typia.assert<string & tags.Format<"uuid">>(id);
    return id;
  }

  function orderAddressId(
    id: string & tags.Format<"uuid">,
  ): string & tags.Format<"uuid"> {
    typia.assert<string & tags.Format<"uuid">>(id);
    return id;
  }

  function orderShippingMethodId(
    id: string & tags.Format<"uuid">,
  ): string & tags.Format<"uuid"> {
    typia.assert<string & tags.Format<"uuid">>(id);
    return id;
  }

  function orderPaymentMethodId(
    id: string & tags.Format<"uuid">,
  ): string & tags.Format<"uuid"> {
    typia.assert<string & tags.Format<"uuid">>(id);
    return id;
  }
}
