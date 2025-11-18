import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewHelpfulVote";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulVote";
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
 * Admin search for review helpful votes with basic filters.
 *
 * This E2E test walks through a realistic multi-actor shopping flow to exercise
 * the admin PATCH /shoppingMall/admin/reviewHelpfulVotes search endpoint with
 * basic filters.
 *
 * Business flow (simplified to match available DTOs/APIs):
 *
 * 1. Admin, seller, and customer accounts are registered and logged in.
 * 2. Admin configures minimal catalog and checkout prerequisites:
 *
 *    - Country and region
 *    - SKU inventory state
 *    - Shipping method
 *    - Payment method
 *    - Category
 * 3. Seller creates a product and one SKU bound to the inventory state.
 * 4. Customer creates a shipping address in the created country/region.
 * 5. Customer creates a cart (actor_type="customer"), adds the SKU as an item, and
 *    creates an order referencing the cart, shipping address, shipping method,
 *    and payment method.
 * 6. Customer creates two reviews (note: IShoppingMallReview.ICreate has only
 *    rating/title/body, so we do not enforce purchase linkage).
 * 7. Customer creates multiple helpful votes using all three available endpoints:
 *
 *    - Global: POST /shoppingMall/customer/reviewHelpfulVotes
 *    - Review-scoped: POST /shoppingMall/customer/reviews/{reviewId}/helpfulVotes
 *    - Customer-scoped: POST
 *         /shoppingMall/customer/customers/{customerId}/helpfulVotes The body
 *         is IShoppingMallReviewHelpfulVote.ICreate (is_helpful only), so
 *         review/customer IDs are taken from path/auth context.
 * 8. The test records review IDs, customer ID, and the created_at range of votes
 *    that should match the admin filter.
 * 9. As admin, the test calls
 *    api.functional.shoppingMall.admin.reviewHelpfulVotes.index with an
 *    IShoppingMallReviewHelpfulVote.IRequest body specifying:
 *
 *    - Page and limit
 *    - ReviewId (one of the reviews)
 *    - CustomerId (the test customer)
 *    - IsHelpful = true
 *    - CreatedFrom/createdTo covering the known helpful vote window.
 * 10. The response is asserted with typia.assert to match
 *     IPageIShoppingMallReviewHelpfulVote.ISummary, and TestValidator
 *     assertions verify that:
 *
 *     - Pagination.current and pagination.limit equal the requested values
 *     - Every returned vote summary has the expected review/customer IDs and
 *           is_helpful=true
 *     - Created_at lies within [createdFrom, createdTo]
 *     - Votes for other reviews or with is_helpful=false are excluded.
 */
export async function test_api_admin_search_review_helpful_votes_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin, seller, and customer
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPw123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com` as string &
      tags.Format<"email">,
    password: "SellerPw123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com` as string &
      tags.Format<"email">,
    password: "CustomerPw123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Admin config data: ensure we are authenticated as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: RandomGenerator.alphabets(2).toUpperCase(),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert(country);

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: RandomGenerator.alphabets(5),
          name_en: RandomGenerator.paragraph({ sentences: 1 }),
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: `in_stock_${RandomGenerator.alphabets(4)}`,
          name: "In Stock",
          description: "Purchasable inventory state",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: `std_${RandomGenerator.alphabets(4)}`,
        display_name: "Standard Shipping",
        service_level_description: "Standard delivery",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: `card_${RandomGenerator.alphabets(4)}`,
        display_name: "Credit Card",
        description: "Generic card",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: `cat-${RandomGenerator.alphabets(5)}`,
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        description_en: null,
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Seller product + SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: `P-${RandomGenerator.alphabets(6)}`,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: null,
        model_name: null,
        status: "active",
        primary_image_uri: null,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  const productCategoryLink =
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
  typia.assert(productCategoryLink);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `SKU-${RandomGenerator.alphabets(6)}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Customer shipping address
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: RandomGenerator.paragraph({ sentences: 1 }),
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Cart -> cart item -> order
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
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
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Create two reviews as the customer
  const review1 = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        rating: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);

  const review2 = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        rating: 4 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);

  // 7. Create multiple helpful votes (mix of true/false, both reviews)
  const votes: IShoppingMallReviewHelpfulVote[] = [];

  const vote1 =
    await api.functional.shoppingMall.customer.reviewHelpfulVotes.create(
      connection,
      {
        body: {
          is_helpful: true,
        } satisfies IShoppingMallReviewHelpfulVote.ICreate,
      },
    );
  typia.assert(vote1);
  votes.push(vote1);

  const vote2 =
    await api.functional.shoppingMall.customer.reviews.helpfulVotes.create(
      connection,
      {
        reviewId: review1.id,
        body: {
          is_helpful: true,
        } satisfies IShoppingMallReviewHelpfulVote.ICreate,
      },
    );
  typia.assert(vote2);
  votes.push(vote2);

  const vote3 =
    await api.functional.shoppingMall.customer.customers.helpfulVotes.create(
      connection,
      {
        customerId: customer.id,
        body: {
          is_helpful: false,
        } satisfies IShoppingMallReviewHelpfulVote.ICreate,
      },
    );
  typia.assert(vote3);
  votes.push(vote3);

  // additional votes on second review for negative filter check
  const vote4 =
    await api.functional.shoppingMall.customer.reviews.helpfulVotes.create(
      connection,
      {
        reviewId: review2.id,
        body: {
          is_helpful: true,
        } satisfies IShoppingMallReviewHelpfulVote.ICreate,
      },
    );
  typia.assert(vote4);
  votes.push(vote4);

  const vote5 =
    await api.functional.shoppingMall.customer.reviews.helpfulVotes.create(
      connection,
      {
        reviewId: review2.id,
        body: {
          is_helpful: false,
        } satisfies IShoppingMallReviewHelpfulVote.ICreate,
      },
    );
  typia.assert(vote5);
  votes.push(vote5);

  // Capture created_at range for votes we intend to match
  const customerIdFilter = customer.id;
  const targetReviewId = review1.id;
  const helpfulVotesForFilter = votes.filter((v) => v.is_helpful === true);

  const createdTimestamps = helpfulVotesForFilter.map((v) => v.created_at);
  const sortedTimestamps = [...createdTimestamps].sort();
  const createdFrom = sortedTimestamps[0];
  const createdTo = sortedTimestamps[sortedTimestamps.length - 1];

  // 9. Switch back to admin to perform search
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const page = 1 as number & tags.Type<"int32">;
  const limit = 20 as number & tags.Type<"int32">;

  const searchRequest = {
    page,
    limit,
    sortBy: "created_at",
    sortDirection: "desc",
    reviewId: targetReviewId,
    customerId: customerIdFilter,
    isHelpful: true,
    createdFrom,
    createdTo,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  const pageResult: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.admin.reviewHelpfulVotes.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 10. Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches",
    pagination.current,
    page as number,
  );
  TestValidator.equals(
    "pagination limit matches",
    pagination.limit,
    limit as number,
  );

  // Ensure all returned votes match filters
  for (const summary of data) {
    TestValidator.equals(
      "summary.review_id matches filter reviewId",
      summary.shopping_mall_review_id,
      targetReviewId,
    );
    TestValidator.equals(
      "summary.customer_id matches filter customerId",
      summary.shopping_mall_customer_id,
      customerIdFilter,
    );
    TestValidator.equals(
      "summary.is_helpful is true",
      summary.is_helpful,
      true,
    );

    TestValidator.predicate(
      "created_at within from/to range",
      summary.created_at >= createdFrom && summary.created_at <= createdTo,
    );
  }

  // 11. Ensure that votes for other reviews or is_helpful=false are excluded
  const idsReturned = new Set(data.map((s) => s.id));

  for (const v of votes) {
    const matchesFilter =
      v.review_id === targetReviewId &&
      v.customer_id === customerIdFilter &&
      v.is_helpful === true &&
      v.created_at >= createdFrom &&
      v.created_at <= createdTo;

    if (matchesFilter) {
      TestValidator.predicate(
        "matching vote should appear in results",
        idsReturned.has(v.id),
      );
    } else {
      TestValidator.predicate(
        "non-matching vote should not appear in results",
        !idsReturned.has(v.id),
      );
    }
  }
}
