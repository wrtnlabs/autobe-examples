import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewImage";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the retrieval and filtering of customer-uploaded review images for a
 * specific product review.
 *
 * This test validates the complete workflow from user registration through
 * product purchase to review submission with image uploads, and finally
 * retrieving those images with various filtering and pagination options. The
 * test ensures that review images are properly stored, retrieved, and ordered
 * according to the customer's intended display sequence.
 */
export async function test_api_review_images_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer account
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

  // Step 2: Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Create and authenticate admin account
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

  // Step 4: Create product category (admin context)
  const categoryData = {
    name: RandomGenerator.name(1),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 5: Create product (seller context)
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 6: Create product SKU variant (seller context)
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 7: Create delivery address (customer context)
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 8: Create payment method (customer context)
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

  // Step 9: Generate a cart ID for adding items
  const cartId = typia.random<string & tags.Format<"uuid">>();

  // Step 10: Add product to shopping cart (customer context)
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

  // Step 11: Create order from cart (customer context)
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

  // Extract the first order ID from the response
  const orderId = orderResponse.order_ids[0];
  typia.assertGuard(orderId!);

  // Step 12: Submit product review (customer context)
  const reviewData = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    shopping_mall_order_id: orderId,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    review_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IShoppingMallReview.ICreate;

  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: reviewData,
    },
  );
  typia.assert(review);

  // Step 13: Upload multiple images to the review (testing 5-image limit)
  const imageCount = 5;
  const uploadedImages = await ArrayUtil.asyncRepeat(
    imageCount,
    async (index) => {
      const imageData = {
        image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        display_order: index + 1,
      } satisfies IShoppingMallReviewImage.ICreate;

      const uploadedImage =
        await api.functional.shoppingMall.customer.reviews.images.create(
          connection,
          {
            reviewId: review.id,
            body: imageData,
          },
        );
      typia.assert(uploadedImage);
      return uploadedImage;
    },
  );

  // Step 14: Retrieve review images with default pagination
  const defaultRequest = {
    page: 1,
    limit: 10,
    sort: "display_order" as const,
  } satisfies IShoppingMallReviewImage.IRequest;

  const defaultResult = await api.functional.shoppingMall.reviews.images.index(
    connection,
    {
      reviewId: review.id,
      body: defaultRequest,
    },
  );
  typia.assert(defaultResult);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultResult.pagination.limit, 10);
  TestValidator.equals(
    "total image count",
    defaultResult.pagination.records,
    imageCount,
  );
  TestValidator.equals("total pages", defaultResult.pagination.pages, 1);

  // Validate all uploaded images are returned
  TestValidator.equals(
    "returned image count",
    defaultResult.data.length,
    imageCount,
  );

  // Validate images are sorted by display_order (ascending)
  for (let i = 0; i < defaultResult.data.length - 1; i++) {
    const currentImage = defaultResult.data[i];
    const nextImage = defaultResult.data[i + 1];
    typia.assertGuard(currentImage!);
    typia.assertGuard(nextImage!);

    TestValidator.predicate(
      `image at index ${i} display_order should be less than next`,
      currentImage.display_order < nextImage.display_order,
    );
  }

  // Step 15: Test pagination with smaller page size
  const paginatedRequest = {
    page: 1,
    limit: 2,
    sort: "display_order" as const,
  } satisfies IShoppingMallReviewImage.IRequest;

  const paginatedResult =
    await api.functional.shoppingMall.reviews.images.index(connection, {
      reviewId: review.id,
      body: paginatedRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "paginated result count",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "paginated total pages",
    paginatedResult.pagination.pages,
    3,
  );

  // Step 16: Test sorting by created_at ascending
  const sortByCreatedRequest = {
    page: 1,
    limit: 10,
    sort: "created_at" as const,
  } satisfies IShoppingMallReviewImage.IRequest;

  const sortByCreatedResult =
    await api.functional.shoppingMall.reviews.images.index(connection, {
      reviewId: review.id,
      body: sortByCreatedRequest,
    });
  typia.assert(sortByCreatedResult);

  TestValidator.equals(
    "sort by created_at result count",
    sortByCreatedResult.data.length,
    imageCount,
  );

  // Step 17: Test sorting by created_at descending
  const sortByCreatedDescRequest = {
    page: 1,
    limit: 10,
    sort: "created_at_desc" as const,
  } satisfies IShoppingMallReviewImage.IRequest;

  const sortByCreatedDescResult =
    await api.functional.shoppingMall.reviews.images.index(connection, {
      reviewId: review.id,
      body: sortByCreatedDescRequest,
    });
  typia.assert(sortByCreatedDescResult);

  TestValidator.equals(
    "sort by created_at_desc result count",
    sortByCreatedDescResult.data.length,
    imageCount,
  );

  // Validate that each returned image belongs to the correct review
  for (const image of defaultResult.data) {
    TestValidator.equals(
      "image review ID matches",
      image.shopping_mall_review_id,
      review.id,
    );
  }

  // Validate that image URLs are present and valid
  for (const image of defaultResult.data) {
    TestValidator.predicate(
      "image URL should be non-empty string",
      image.image_url.length > 0,
    );
  }

  // Validate display_order values match uploaded images
  const uploadedDisplayOrders = uploadedImages
    .map((img) => img.display_order)
    .sort((a, b) => a - b);
  const retrievedDisplayOrders = defaultResult.data
    .map((img) => img.display_order)
    .sort((a, b) => a - b);
  TestValidator.equals(
    "display orders match",
    retrievedDisplayOrders,
    uploadedDisplayOrders,
  );
}
