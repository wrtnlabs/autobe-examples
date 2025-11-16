import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test retrieving complete details of a specific review image including all
 * size variants and metadata.
 *
 * This test validates the end-to-end workflow from product purchase to review
 * submission with images, and finally retrieving individual image details. The
 * test ensures that review images can be retrieved with complete information
 * including all three size variants (original, thumbnail, medium), proper
 * review association, correct display ordering, and accurate metadata.
 *
 * Workflow:
 *
 * 1. Create buyer account
 * 2. Create admin account for category management
 * 3. Create product category
 * 4. Create seller account
 * 5. Create product sale listing
 * 6. Create product SKU variant
 * 7. Add SKU to buyer's cart
 * 8. Create delivery address
 * 9. Register payment method
 * 10. Create order from cart
 * 11. Submit product review with initial images
 * 12. Upload additional image to existing review
 * 13. Retrieve specific review image by ID
 * 14. Validate image belongs to correct review
 * 15. Validate display_order is correctly set
 * 16. Validate created_at timestamp is present
 * 17. Validate retrieved image matches uploaded image data
 */
export async function test_api_review_image_retrieval_complete_details(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
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

  // Step 2: Create admin account for category management
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

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create product SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Medium" }),
        base_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Switch to buyer and add SKU to cart
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 8: Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 9: Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >() satisfies number as number,
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >() satisfies number as number,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(6),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 10: Create order from cart
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

  // Step 11: Submit product review with initial images
  const initialImageData = {
    image_url: typia.random<string & tags.Format<"uri">>(),
    thumbnail_url: typia.random<string & tags.Format<"uri">>(),
    medium_url: typia.random<string & tags.Format<"uri">>(),
    display_order: 0 satisfies number as number,
  } satisfies IShoppingMallReviewImage.ICreate;

  const review = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_sale_id: sale.id,
        shopping_mall_sale_sku_id: sku.id,
        shopping_mall_order_id: order.id,
        star_rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >() satisfies number as number,
        review_title: RandomGenerator.paragraph({ sentences: 3 }),
        review_body: RandomGenerator.content({ paragraphs: 2 }),
        is_anonymous: false,
        images: [initialImageData],
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 12: Upload additional image to existing review
  const additionalImage =
    await api.functional.shoppingMall.buyer.reviews.images.create(connection, {
      reviewId: review.id,
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        thumbnail_url: typia.random<string & tags.Format<"uri">>(),
        medium_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1 satisfies number as number,
      } satisfies IShoppingMallReviewImage.ICreate,
    });
  typia.assert(additionalImage);

  // Step 13: Retrieve specific review image by ID
  const retrievedImage = await api.functional.shoppingMall.reviews.images.at(
    connection,
    {
      reviewId: review.id,
      imageId: additionalImage.id,
    },
  );
  typia.assert(retrievedImage);

  // Step 14: Validate image belongs to correct review
  TestValidator.equals(
    "image belongs to correct review",
    retrievedImage.shopping_mall_review_id,
    review.id,
  );

  // Step 15: Validate display_order is correctly set
  TestValidator.equals(
    "display_order matches uploaded value",
    retrievedImage.display_order,
    additionalImage.display_order,
  );

  // Step 16: Validate created_at timestamp is present
  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedImage.created_at !== null &&
      retrievedImage.created_at !== undefined,
  );

  // Step 17: Validate retrieved image matches uploaded image data
  TestValidator.equals(
    "retrieved image ID matches uploaded image",
    retrievedImage.id,
    additionalImage.id,
  );
  TestValidator.equals(
    "image URLs match",
    retrievedImage.image_url,
    additionalImage.image_url,
  );
  TestValidator.equals(
    "thumbnail URLs match",
    retrievedImage.thumbnail_url,
    additionalImage.thumbnail_url,
  );
  TestValidator.equals(
    "medium URLs match",
    retrievedImage.medium_url,
    additionalImage.medium_url,
  );
}
