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

export async function test_api_review_submission_verified_purchase(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "SecurePass123!";
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shop.example.com/register",
      referrer: "https://shop.example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create admin account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
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
      business_name: "Tech Store Inc",
      business_description: RandomGenerator.content({ paragraphs: 2 }),
      store_name: "Tech Store",
      href: "https://seller.example.com/register",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Create product sale listing
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: productCode,
        shopping_mall_category_id: category.id,
        title: "Premium Wireless Headphones",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: "AudioTech",
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create SKU variant for the product
  const skuCode = `${productCode}-BLK-STD`;
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: productCode,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({
          Color: "Black",
          Size: "Standard",
        }),
        base_price: 149.99,
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
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/products",
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Step 8: Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: "123 Main Street, Apt 4B",
          city: "New York",
          state: "NY",
          postal_code: "10001",
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
        provider_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        card_brand: "visa",
        last_four_digits: "4242",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: "10001",
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 10: Add product to cart
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

  // Step 11: Create order (verified purchase)
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: "Please deliver during business hours",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 12: Submit product review
  const reviewImages = ArrayUtil.repeat(3, (index) => {
    const imageId = RandomGenerator.alphaNumeric(16);
    return {
      image_url: `https://cdn.example.com/reviews/${imageId}_original.jpg`,
      thumbnail_url: `https://cdn.example.com/reviews/${imageId}_thumb.jpg`,
      medium_url: `https://cdn.example.com/reviews/${imageId}_medium.jpg`,
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
        review_title: "Excellent sound quality and comfort!",
        review_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
        is_anonymous: false,
        images: reviewImages,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 13: Validate review creation
  TestValidator.equals(
    "review sale ID matches",
    review.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "review SKU ID matches",
    review.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "review order ID matches",
    review.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "review buyer ID matches",
    review.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals("star rating is 5", review.star_rating, 5);
  TestValidator.equals(
    "review title matches",
    review.review_title,
    "Excellent sound quality and comfort!",
  );
  TestValidator.equals(
    "review status is pending moderation",
    review.status,
    "pending_moderation",
  );
  TestValidator.equals(
    "review is verified purchase",
    review.is_verified_purchase,
    true,
  );
  TestValidator.equals("review is not anonymous", review.is_anonymous, false);
  TestValidator.equals("review has 3 images", review.images.length, 3);
  TestValidator.predicate(
    "review body is substantial",
    (review.review_body?.length ?? 0) > 50,
  );
  TestValidator.equals(
    "helpfulness vote count starts at 0",
    review.helpfulness_vote_count,
    0,
  );
}
