import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test searching and retrieving review images with pagination and sorting.
 *
 * This test validates the complete workflow of creating a review with multiple
 * images and then searching through those images using various pagination and
 * sorting options. It ensures that the review images search API correctly
 * handles pagination parameters, sorting criteria, and returns complete image
 * data with accurate metadata.
 *
 * Workflow:
 *
 * 1. Create buyer account and authenticate
 * 2. Create admin account for category setup
 * 3. Create product category
 * 4. Create seller account
 * 5. Create product sale listing
 * 6. Create product SKU variant
 * 7. Add SKU to buyer's cart
 * 8. Create delivery address for buyer
 * 9. Register payment method for buyer
 * 10. Create order from cart items
 * 11. Submit product review with multiple images
 * 12. Search review images with default pagination
 * 13. Search with custom page size and sorting by created_at descending
 * 14. Search with sorting by display_order ascending
 * 15. Verify pagination metadata accuracy
 * 16. Verify image URLs are properly returned
 * 17. Verify images are sorted according to requested parameters
 */
export async function test_api_review_images_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 2. Create admin account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 5. Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 6. Create product SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Switch to buyer account
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // 7. Add SKU to buyer's cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 8. Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "USA",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 9. Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: 12,
        expiry_year: 2026,
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 10. Create order from cart items
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 11. Submit product review with multiple images (create 5 images for pagination testing)
  const reviewImages = ArrayUtil.repeat(5, (index) => {
    const baseUrl = typia.random<string & tags.Format<"uri">>();
    return {
      image_url: baseUrl,
      thumbnail_url: `${baseUrl}/thumbnail`,
      medium_url: `${baseUrl}/medium`,
      display_order: index,
    } satisfies IShoppingMallReviewImage.ICreate;
  });

  const review = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_sale_id: sale.id,
        shopping_mall_sale_sku_id: sku.id,
        shopping_mall_order_id: order.id,
        star_rating: 5,
        review_title: RandomGenerator.paragraph({ sentences: 2 }),
        review_body: RandomGenerator.content({ paragraphs: 2 }),
        is_anonymous: false,
        images: reviewImages,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // 12. Search review images with default pagination (should return sorted by display_order)
  const defaultSearch = await api.functional.shoppingMall.reviews.images.index(
    connection,
    {
      reviewId: review.id,
      body: {} satisfies IShoppingMallReviewImage.IRequest,
    },
  );
  typia.assert(defaultSearch);

  // Verify pagination metadata for default search
  TestValidator.predicate(
    "default search returns pagination data",
    defaultSearch.pagination.records === 5,
  );
  TestValidator.predicate(
    "default search has correct page count",
    defaultSearch.pagination.pages >= 1,
  );

  // 13. Search with custom page size and sorting by created_at descending
  const customSearch = await api.functional.shoppingMall.reviews.images.index(
    connection,
    {
      reviewId: review.id,
      body: {
        page: 1,
        limit: 3,
        sort: "-created_at",
      } satisfies IShoppingMallReviewImage.IRequest,
    },
  );
  typia.assert(customSearch);

  // Verify pagination metadata for custom search
  TestValidator.equals(
    "custom search page number",
    customSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom search page limit",
    customSearch.pagination.limit,
    3,
  );
  TestValidator.equals(
    "custom search total records",
    customSearch.pagination.records,
    5,
  );
  TestValidator.predicate(
    "custom search returns at most 3 items",
    customSearch.data.length <= 3,
  );

  // 14. Search with sorting by display_order ascending
  const sortedByOrder = await api.functional.shoppingMall.reviews.images.index(
    connection,
    {
      reviewId: review.id,
      body: {
        page: 1,
        limit: 10,
        sort: "display_order",
      } satisfies IShoppingMallReviewImage.IRequest,
    },
  );
  typia.assert(sortedByOrder);

  // 15. Verify pagination metadata accuracy
  TestValidator.equals(
    "sorted search total records matches created images",
    sortedByOrder.pagination.records,
    5,
  );
  TestValidator.predicate(
    "sorted search returns all images in single page",
    sortedByOrder.data.length === 5,
  );

  // 16. Verify image URLs (original, thumbnail, medium) are properly returned
  TestValidator.predicate(
    "all images have original URL",
    sortedByOrder.data.every(
      (img) => img.image_url !== null && img.image_url !== undefined,
    ),
  );
  TestValidator.predicate(
    "all images have thumbnail URL",
    sortedByOrder.data.every(
      (img) => img.thumbnail_url !== null && img.thumbnail_url !== undefined,
    ),
  );
  TestValidator.predicate(
    "all images have medium URL",
    sortedByOrder.data.every(
      (img) => img.medium_url !== null && img.medium_url !== undefined,
    ),
  );

  // 17. Verify images are sorted by display_order ascending
  TestValidator.predicate(
    "images sorted by display_order ascending",
    sortedByOrder.data.every((img, idx) => {
      if (idx === 0) return true;
      return sortedByOrder.data[idx - 1].display_order <= img.display_order;
    }),
  );

  // Verify all images belong to the correct review
  TestValidator.predicate(
    "all images belong to the review",
    sortedByOrder.data.every(
      (img) => img.shopping_mall_review_id === review.id,
    ),
  );
}
