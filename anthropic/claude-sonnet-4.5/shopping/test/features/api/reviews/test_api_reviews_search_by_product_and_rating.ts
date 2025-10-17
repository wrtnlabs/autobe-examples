import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test comprehensive review search functionality with product and rating
 * filters.
 *
 * This test validates the advanced search capabilities of the review system
 * including:
 *
 * - Creating a complete e-commerce workflow from product creation to order
 *   completion
 * - Submitting multiple reviews with different ratings (1-5 stars)
 * - Searching reviews by product ID filter
 * - Searching reviews by rating level filter
 * - Testing pagination functionality
 * - Validating search results match filter criteria exactly
 *
 * Steps:
 *
 * 1. Create admin and category
 * 2. Create seller and product with SKU
 * 3. Create customer, address, payment method
 * 4. Place order and complete checkout
 * 5. Submit multiple reviews with varying ratings
 * 6. Search and validate results by product ID
 * 7. Search and validate results by rating filter
 * 8. Test pagination
 */
export async function test_api_reviews_search_by_product_and_rating(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and product category
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  const categoryData = {
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 2: Create seller account and product
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  const productData = {
    name: RandomGenerator.name(),
    base_price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 3: Create customer account with address and payment method
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Add product to cart and place order
  const cartId = typia.random<string & tags.Format<"uuid">>();

  const cartItemData = {
    shopping_mall_sku_id: sku.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemData,
    });
  typia.assert(cartItem);

  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: "standard",
  } satisfies IShoppingMallOrder.ICreate;

  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(orderResponse);

  // Step 5: Submit multiple reviews with different ratings (1-5 stars)
  const ratings = [1, 2, 3, 4, 5] as const;
  const reviews: IShoppingMallReview[] = [];

  for (const rating of ratings) {
    const reviewData = {
      shopping_mall_product_id: product.id,
      shopping_mall_sku_id: sku.id,
      shopping_mall_order_id: orderResponse.order_ids[0],
      rating: rating,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      review_text: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IShoppingMallReview.ICreate;

    const review = await api.functional.shoppingMall.customer.reviews.create(
      connection,
      {
        body: reviewData,
      },
    );
    typia.assert(review);
    reviews.push(review);
  }

  // Step 6: Search reviews by product ID only
  const searchByProductRequest = {
    shopping_mall_product_id: product.id,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReview.IRequest;

  const productSearchResults = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: searchByProductRequest,
    },
  );
  typia.assert(productSearchResults);

  TestValidator.predicate(
    "search by product returns results",
    productSearchResults.data.length > 0,
  );

  // Step 7: Search reviews by product ID and specific rating (5 stars)
  const searchByRatingRequest = {
    shopping_mall_product_id: product.id,
    rating: 5,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReview.IRequest;

  const ratingSearchResults = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: searchByRatingRequest,
    },
  );
  typia.assert(ratingSearchResults);

  TestValidator.predicate(
    "search by rating 5 returns at least one result",
    ratingSearchResults.data.length > 0,
  );

  for (const review of ratingSearchResults.data) {
    TestValidator.equals("filtered review has rating 5", review.rating, 5);
  }

  // Step 8: Search reviews by product ID and different rating (1 star)
  const searchByLowRatingRequest = {
    shopping_mall_product_id: product.id,
    rating: 1,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReview.IRequest;

  const lowRatingSearchResults =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: searchByLowRatingRequest,
    });
  typia.assert(lowRatingSearchResults);

  TestValidator.predicate(
    "search by rating 1 returns at least one result",
    lowRatingSearchResults.data.length > 0,
  );

  for (const review of lowRatingSearchResults.data) {
    TestValidator.equals("filtered review has rating 1", review.rating, 1);
  }

  // Step 9: Test pagination
  const paginationRequest = {
    shopping_mall_product_id: product.id,
    page: 1,
    limit: 2,
  } satisfies IShoppingMallReview.IRequest;

  const paginatedResults = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: paginationRequest,
    },
  );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResults.data.length <= 2,
  );

  TestValidator.equals(
    "pagination current page is 1",
    paginatedResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit is 2",
    paginatedResults.pagination.limit,
    2,
  );
}
