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
import type { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a buyer can retrieve detailed information about a review report
 * they previously submitted.
 *
 * This test validates the complete review report retrieval workflow by
 * establishing a verified purchase context, submitting a product review,
 * reporting that review for policy violations, and then retrieving the report
 * details through the GET endpoint. The test ensures that buyers can track the
 * status of their submitted reports and access the full context of what they
 * reported.
 *
 * Workflow Steps:
 *
 * 1. Create buyer account (report submitter)
 * 2. Create admin account for category management
 * 3. Create seller account for product listing
 * 4. Admin creates product category
 * 5. Seller creates product sale listing
 * 6. Seller creates SKU variant
 * 7. Buyer creates delivery address
 * 8. Buyer registers payment method
 * 9. Buyer adds product to cart
 * 10. Buyer creates order (completes purchase)
 * 11. Buyer submits product review
 * 12. Buyer reports the review for policy violations
 * 13. Buyer retrieves the report details
 * 14. Validate all report information is correct and complete
 */
export async function test_api_review_report_retrieval_by_reporter(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account (primary actor - report submitter)
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "SecurePass123!";
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
  const adminPassword = "AdminPass123!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "moderator",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category as admin
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

  // Step 4: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
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

  // Step 5: Seller creates product sale
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
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Seller creates SKU variant
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

  // Step 7: Switch to buyer account
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Step 8: Buyer creates delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 2 }),
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
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 9: Buyer registers payment method
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
        billing_postal_code: "12345",
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 10: Buyer adds product to cart
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

  // Step 11: Buyer creates order (completes purchase)
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: "Test order for review",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 12: Buyer submits product review
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
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 13: Buyer reports the review for policy violations
  const reportReason = RandomGenerator.pick([
    "spam",
    "offensive_language",
    "fake_review",
    "not_about_product",
    "personal_information",
    "other",
  ] as const);
  const reportDetails = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const createdReport =
    await api.functional.shoppingMall.buyer.reviews.reports.create(connection, {
      reviewId: review.id,
      body: {
        report_reason: reportReason,
        report_details: reportDetails,
      } satisfies IShoppingMallReviewReport.ICreate,
    });
  typia.assert(createdReport);

  // Step 14: Buyer retrieves the report details
  const retrievedReport =
    await api.functional.shoppingMall.buyer.reviews.reports.at(connection, {
      reviewId: review.id,
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);

  // Step 15: Validate report information is correct and complete
  TestValidator.equals(
    "retrieved report ID matches created report",
    retrievedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "report reason matches submitted reason",
    retrievedReport.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report details match submitted description",
    retrievedReport.report_details,
    reportDetails,
  );
  TestValidator.equals(
    "report status is pending moderation",
    retrievedReport.status,
    "pending",
  );
  TestValidator.predicate(
    "reporter buyer information is included",
    retrievedReport.buyer !== null && retrievedReport.buyer !== undefined,
  );
  TestValidator.predicate(
    "review summary is embedded in response",
    retrievedReport.review !== null && retrievedReport.review !== undefined,
  );
  TestValidator.equals(
    "review ID in summary matches reported review",
    retrievedReport.review.id,
    review.id,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );
  TestValidator.equals(
    "reviewed_at is null for pending reports",
    retrievedReport.reviewed_at,
    null,
  );
  TestValidator.predicate(
    "seller is null for buyer-submitted reports",
    retrievedReport.seller === null || retrievedReport.seller === undefined,
  );
}
