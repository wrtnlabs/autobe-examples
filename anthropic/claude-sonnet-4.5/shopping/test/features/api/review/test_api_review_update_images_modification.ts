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

export async function test_api_review_update_images_modification(
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

  // Step 2: Admin creates category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph(),
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
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Blue", Size: "M" }),
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create buyer account
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

  // Step 7: Buyer creates delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 8: Buyer registers payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: ArrayUtil.repeat(4, () =>
          RandomGenerator.pick([..."0123456789"]),
        ).join(""),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(6),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Buyer adds product to cart
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

  // Step 10: Buyer creates order
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

  // Step 11: Create initial review with 2 images
  const initialImages = ArrayUtil.repeat(2, (index) => {
    return {
      image_url: typia.random<string & tags.Format<"uri">>(),
      thumbnail_url: typia.random<string & tags.Format<"uri">>(),
      medium_url: typia.random<string & tags.Format<"uri">>(),
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
        images: initialImages,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Validate initial review has 2 images
  TestValidator.equals(
    "initial review should have 2 images",
    review.images.length,
    2,
  );

  // Step 12: Update review with 3 different images
  const updatedImages = ArrayUtil.repeat(3, (index) => {
    return {
      image_url: typia.random<string & tags.Format<"uri">>(),
      thumbnail_url: typia.random<string & tags.Format<"uri">>(),
      medium_url: typia.random<string & tags.Format<"uri">>(),
      display_order: index,
    } satisfies IShoppingMallReviewImage.ICreate;
  });

  const updatedReview = await api.functional.shoppingMall.buyer.reviews.update(
    connection,
    {
      reviewId: review.id,
      body: {
        images: updatedImages,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updatedReview);

  // Validate updated review has 3 new images
  TestValidator.equals(
    "updated review should have 3 images",
    updatedReview.images.length,
    3,
  );

  // Validate images are different from initial images by comparing URLs
  const initialImageUrls = review.images.map((img) => img.image_url).sort();
  const updatedImageUrls = updatedReview.images
    .map((img) => img.image_url)
    .sort();
  TestValidator.notEquals(
    "image URLs should be different after update",
    initialImageUrls,
    updatedImageUrls,
  );
}
