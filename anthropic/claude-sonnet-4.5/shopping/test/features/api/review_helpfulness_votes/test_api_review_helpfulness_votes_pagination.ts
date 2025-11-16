import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewHelpfulnessVote";
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
import type { IShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessVote";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_review_helpfulness_votes_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
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

  // Step 2: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
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

  // Step 4: Create product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create initial buyer account
  const initialBuyerEmail = typia.random<string & tags.Format<"email">>();
  const initialBuyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: initialBuyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(initialBuyer);

  // Step 7: Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 8: Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "1234",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Add item to cart
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

  // Step 10: Create order
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

  // Step 11: Create review
  const review = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_sale_id: sale.id,
        shopping_mall_sale_sku_id: sku.id,
        shopping_mall_order_id: order.id,
        star_rating: 5,
        review_title: RandomGenerator.paragraph({ sentences: 3 }),
        review_body: RandomGenerator.content({ paragraphs: 2 }),
        is_anonymous: false,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 12: Create 15 additional buyers and have each submit a vote
  const voters = await ArrayUtil.asyncRepeat(15, async (index) => {
    const voterEmail = typia.random<string & tags.Format<"email">>();
    const voter = await api.functional.auth.buyer.join(connection, {
      body: {
        email: voterEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
    typia.assert(voter);

    // Submit helpfulness vote
    const vote =
      await api.functional.shoppingMall.buyer.reviews.helpfulnessVotes.create(
        connection,
        {
          reviewId: review.id,
          body: {
            is_helpful: index % 2 === 0,
          } satisfies IShoppingMallReviewHelpfulnessVote.ICreate,
        },
      );
    typia.assert(vote);

    return vote;
  });

  TestValidator.equals("created 15 votes", voters.length, 15);

  // Step 13: Test pagination with limit=5 (should yield 3 pages)
  const page1 =
    await api.functional.shoppingMall.reviews.helpfulnessVotes.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(page1);

  // Validate page 1 metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 1 total records", page1.pagination.records, 15);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data count", page1.data.length, 5);

  // Step 14: Retrieve page 2
  const page2 =
    await api.functional.shoppingMall.reviews.helpfulnessVotes.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(page2);

  // Validate page 2 metadata
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 total records", page2.pagination.records, 15);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  TestValidator.equals("page 2 data count", page2.data.length, 5);

  // Step 15: Retrieve page 3
  const page3 =
    await api.functional.shoppingMall.reviews.helpfulnessVotes.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies IShoppingMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(page3);

  // Validate page 3 metadata
  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 5);
  TestValidator.equals("page 3 total records", page3.pagination.records, 15);
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);
  TestValidator.equals("page 3 data count", page3.data.length, 5);

  // Step 16: Verify no duplicates across pages
  const allVoteIds = [
    ...page1.data.map((v) => v.id),
    ...page2.data.map((v) => v.id),
    ...page3.data.map((v) => v.id),
  ];
  const uniqueVoteIds = new Set(allVoteIds);
  TestValidator.equals(
    "no duplicate votes across pages",
    uniqueVoteIds.size,
    15,
  );

  // Step 17: Test boundary condition - page beyond total pages
  const beyondPage =
    await api.functional.shoppingMall.reviews.helpfulnessVotes.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 10,
          limit: 5,
        } satisfies IShoppingMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page shows correct total",
    beyondPage.pagination.records,
    15,
  );
}
