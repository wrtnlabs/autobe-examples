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
import type { IShoppingMallReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSellerResponse";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller response creation to buyer product review.
 *
 * This test validates the complete seller response workflow where an
 * authenticated seller responds to a verified purchase review on their product.
 * The test ensures proper business rule enforcement including seller ownership
 * validation, one-response-per-review constraint, content length requirements,
 * and correct moderation status assignment.
 *
 * The scenario creates a complete e-commerce flow:
 *
 * 1. Admin creates product category
 * 2. Seller registers and lists a product with SKU
 * 3. Buyer registers, adds product to cart, and completes purchase
 * 4. Buyer submits a verified purchase review
 * 5. Seller responds to the review
 * 6. Validates response creation and business rules
 */
export async function test_api_seller_response_creation_to_buyer_review(
  connection: api.IConnection,
) {
  // Step 1: Admin creates product category
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

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
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

  // Step 3: Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 4: Create SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: (typia.random<number & tags.Minimum<0>>() % 1000) + 10,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 5: Buyer registration and authentication
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 6: Create buyer shipping address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "USA",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 7: Register payment method
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
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 8: Add product to cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 9: Create order from cart items
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

  // Step 10: Buyer submits product review
  const review = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_sale_id: sale.id,
        shopping_mall_sale_sku_id: sku.id,
        shopping_mall_order_id: order.id,
        star_rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        review_title: RandomGenerator.paragraph({ sentences: 3 }),
        review_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        is_anonymous: false,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 11: Switch to seller account to respond to review
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 12: Seller creates response to the review (PRIMARY TEST)
  const responseBodyText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  const sellerResponse =
    await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
      connection,
      {
        reviewId: review.id,
        body: {
          response_body: responseBodyText,
        } satisfies IShoppingMallReviewSellerResponse.ICreate,
      },
    );
  typia.assert(sellerResponse);

  // Step 13: Validate response creation
  TestValidator.equals(
    "response body matches submitted text",
    sellerResponse.response_body,
    responseBodyText,
  );
  TestValidator.equals(
    "response status is pending moderation",
    sellerResponse.status,
    "pending_moderation",
  );
  TestValidator.equals(
    "response linked to correct review",
    sellerResponse.shopping_mall_review_id,
    review.id,
  );
  TestValidator.equals(
    "response linked to correct seller",
    sellerResponse.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "creation timestamp is set",
    sellerResponse.created_at !== null &&
      sellerResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "response body meets minimum length",
    sellerResponse.response_body.length >= 10,
  );
  TestValidator.predicate(
    "response body meets maximum length",
    sellerResponse.response_body.length <= 2000,
  );

  // Step 14: Test business rule - duplicate response should fail
  await TestValidator.error(
    "duplicate response attempt should fail",
    async () => {
      await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
        connection,
        {
          reviewId: review.id,
          body: {
            response_body: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 15,
              sentenceMax: 25,
            }),
          } satisfies IShoppingMallReviewSellerResponse.ICreate,
        },
      );
    },
  );
}
