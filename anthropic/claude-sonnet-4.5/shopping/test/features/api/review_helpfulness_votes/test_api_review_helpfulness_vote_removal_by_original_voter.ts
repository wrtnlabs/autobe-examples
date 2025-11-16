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
import type { IShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessVote";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete workflow of a buyer removing their helpfulness vote from a
 * product review.
 *
 * This test validates that authenticated buyers can successfully retract their
 * previously submitted vote indicating whether a review was helpful. The test
 * creates a complete context starting with multi-actor authentication (admin
 * for categories, seller for products, buyer for purchasing), product listing
 * setup, complete purchase workflow, review submission, helpfulness vote
 * creation, and finally vote deletion.
 *
 * The operation should successfully remove the vote record from the
 * shopping_mall_review_helpfulness_votes table and return the deleted vote
 * record. The test verifies that only the original voter can delete their own
 * vote through proper authorization.
 *
 * Workflow Steps:
 *
 * 1. Admin authentication and category creation
 * 2. Seller authentication and product listing (sale + SKU)
 * 3. Buyer authentication and purchase workflow (cart + address + payment + order)
 * 4. Review submission by buyer
 * 5. Helpfulness vote creation by buyer
 * 6. Vote deletion by original voter (main test operation)
 * 7. Validation of deletion response
 */
export async function test_api_review_helpfulness_vote_removal_by_original_voter(
  connection: api.IConnection,
) {
  // Step 1: Admin Setup - Create Category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "moderator",
        email_verified: true,
        href: "https://admin.marketplace.com/register",
        referrer: "https://admin.marketplace.com",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 2: Seller Setup - Create Product Sale and SKU
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(3),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(2),
        href: "https://seller.marketplace.com/register",
        referrer: "https://marketplace.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku);

  // Step 3: Buyer Setup - Authentication and Purchase Workflow
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        href: "https://marketplace.com/register",
        referrer: "https://marketplace.com",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  const cartItem: IShoppingMallCartItem =
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

  const address: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  const paymentMethod: IShoppingMallPaymentMethod =
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
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.buyer.orders.create(connection, {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Step 4: Review Creation
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.buyer.reviews.create(connection, {
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
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(review);

  // Step 5: Helpfulness Vote Creation
  const vote: IShoppingMallReviewHelpfulnessVote =
    await api.functional.shoppingMall.buyer.reviews.helpfulnessVotes.create(
      connection,
      {
        reviewId: review.id,
        body: {
          is_helpful: true,
        } satisfies IShoppingMallReviewHelpfulnessVote.ICreate,
      },
    );
  typia.assert(vote);

  // Step 6: Vote Deletion (Main Test Operation)
  const deletedVote: IShoppingMallReviewHelpfulnessVote =
    await api.functional.shoppingMall.buyer.reviews.helpfulnessVotes.erase(
      connection,
      {
        reviewId: review.id,
        voteId: vote.id,
      },
    );
  typia.assert(deletedVote);

  // Step 7: Validation
  TestValidator.equals(
    "deleted vote ID matches created vote",
    deletedVote.id,
    vote.id,
  );
  TestValidator.equals(
    "deleted vote review ID matches",
    deletedVote.shopping_mall_review_id,
    review.id,
  );
  TestValidator.equals(
    "deleted vote buyer ID matches",
    deletedVote.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "deleted vote helpfulness matches",
    deletedVote.is_helpful,
    vote.is_helpful,
  );
}
