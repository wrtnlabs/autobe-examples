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
 * Test seller response creation and update workflow for product reviews.
 *
 * This test validates the complete multi-actor workflow enabling sellers to
 * engage with customer feedback by posting official responses to product
 * reviews. The test covers the entire business flow from marketplace setup
 * through product listing, purchase, delivery, review submission, and finally
 * seller response.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates and creates product category
 * 2. Seller authenticates and creates product sale listing
 * 3. Seller creates SKU variant for the product
 * 4. Buyer authenticates and sets up delivery address
 * 5. Buyer registers payment method
 * 6. Buyer adds product to shopping cart
 * 7. Buyer creates order from cart items
 * 8. Order reaches delivered status for review eligibility
 * 9. Buyer submits product review with rating and content
 * 10. Seller responds to the review with professional reply
 * 11. Validate response creation and association with review
 */
export async function test_api_seller_response_update_for_existing_review(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and creates product category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: "https://admin.marketplace.test/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://marketplace.test" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryBody,
    },
  );
  typia.assert(category);

  // Step 2: Seller authenticates and creates product sale listing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 10 }),
    store_name: RandomGenerator.name(2),
    href: "https://seller.marketplace.test/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://marketplace.test" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  const saleBody = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    condition: "new" as const,
    return_policy_days: 30 as const,
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleBody,
    },
  );
  typia.assert(sale);

  // Step 3: Seller creates SKU variant
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({ Color: "Black", Size: "Medium" }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuBody,
    },
  );
  typia.assert(sku);

  // Step 4: Buyer authenticates and sets up delivery address
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerJoinBody = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    href: "https://marketplace.test/buyer/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://marketplace.test" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerJoinBody,
  });
  typia.assert(buyer);

  const addressBody = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "United States",
    address_label: "Home",
    address_type: "residential",
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressBody,
      },
    );
  typia.assert(address);

  // Step 5: Buyer registers payment method
  const paymentMethodBody = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    billing_name: RandomGenerator.name(),
    card_brand: "visa",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // Step 6: Buyer adds product to shopping cart
  const cartItemBody = {
    shopping_mall_sale_sku_id: sku.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // Step 7: Buyer creates order from cart items
  const orderBody = {
    cart_item_ids: [cartItem.id],
    buyer_address_id: address.id,
    payment_method_id: paymentMethod.id,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // Step 9: Buyer submits product review
  const reviewBody = {
    shopping_mall_sale_id: sale.id,
    shopping_mall_sale_sku_id: sku.id,
    shopping_mall_order_id: order.id,
    star_rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    review_title: RandomGenerator.paragraph({ sentences: 2 }),
    review_body: RandomGenerator.content({ paragraphs: 2 }),
    is_anonymous: false,
  } satisfies IShoppingMallReview.ICreate;

  const review = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: reviewBody,
    },
  );
  typia.assert(review);

  // Step 10: Seller responds to the review
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.marketplace.test/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://seller.marketplace.test" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sellerResponseBody = {
    response_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IShoppingMallReviewSellerResponse.ICreate;

  const sellerResponse =
    await api.functional.shoppingMall.seller.reviews.sellerResponse.update(
      connection,
      {
        reviewId: review.id,
        body: sellerResponseBody,
      },
    );
  typia.assert(sellerResponse);

  // Step 11: Validate response creation and business logic
  TestValidator.equals(
    "seller response review ID matches",
    sellerResponse.shopping_mall_review_id,
    review.id,
  );
  TestValidator.equals(
    "seller response seller ID matches",
    sellerResponse.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "seller response body matches input",
    sellerResponse.response_body,
    sellerResponseBody.response_body,
  );
}
