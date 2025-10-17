import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * End-to-end test for updating product review moderation by an authorized
 * admin.
 *
 * 1. Admin is registered and authenticated for privileged operations.
 * 2. Customer account is created for review posting.
 * 3. Product category is created to classify the product.
 * 4. Seller account is created to own the product.
 * 5. Product is created with references to category and seller.
 * 6. Order is created confirming customer's purchase of the product.
 * 7. Customer posts a product review referencing the order and product.
 * 8. Admin creates a moderation record for the product review.
 * 9. Admin updates the moderation record action and comment.
 *
 * Validates all API responses with typia.assert and verifies business logic
 * through TestValidator checks. Ensures proper authorization and data flows
 * through to update moderation successfully.
 */
export async function test_api_product_review_moderation_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer account creation
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass!";
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: customerPassword,
        nickname: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: `cat-${RandomGenerator.alphaNumeric(6)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create seller account
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass!";
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPassword,
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Create product
  const productCode = `prd-${RandomGenerator.alphaNumeric(6)}`;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        status: "Active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Create order confirming customer's purchase
  const orderNumber = `ord-${RandomGenerator.alphaNumeric(8)}`;
  const orderTotalPrice = Number((Math.random() * 1000 + 50).toFixed(2));
  const orderStatus = "Paid";
  const orderBusinessStatus = "Confirmed";
  const paymentMethod = "Credit Card";
  const shippingAddress = `${RandomGenerator.name()}, 123 Test Street, Test City`;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: orderStatus,
        business_status: orderBusinessStatus,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 7. Customer posts a product review
  const rating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = RandomGenerator.sample(
    [1, 2, 3, 4, 5] as const,
    1,
  )[0] satisfies
    | number
    | tags.Type<"int32">
    | tags.Minimum<1>
    | tags.Maximum<5> as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const reviewText = RandomGenerator.paragraph({ sentences: 10 });
  const productReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_product_id: product.id,
          shopping_mall_order_id: order.id,
          rating: rating,
          review_text: reviewText,
          status: "pending",
        } satisfies IShoppingMallProductReview.ICreate,
      },
    );
  typia.assert(productReview);

  // 8. Admin creates a moderation record for the review
  const moderationActionInitial = "pending";
  const moderationCommentInitial = "Initial moderation needed.";
  const moderation: IShoppingMallReviewModeration =
    await api.functional.shoppingMall.admin.productReviews.reviewModerations.create(
      connection,
      {
        productReviewId: productReview.id,
        body: {
          shopping_mall_product_review_id: productReview.id,
          shopping_mall_admin_id: admin.id,
          action: moderationActionInitial,
          comment: moderationCommentInitial,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } satisfies IShoppingMallReviewModeration.ICreate,
      },
    );
  typia.assert(moderation);

  // 9. Admin updates the moderation record
  const moderationActionUpdated = "approved";
  const moderationCommentUpdated = "Review approved after validation.";

  const updatedModeration: IShoppingMallReviewModeration =
    await api.functional.shoppingMall.admin.productReviews.reviewModerations.updateReviewModeration(
      connection,
      {
        productReviewId: productReview.id,
        id: moderation.id,
        body: {
          action: moderationActionUpdated,
          comment: moderationCommentUpdated,
          updated_at: new Date().toISOString(),
        } satisfies IShoppingMallReviewModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);

  // Validate that updated moderation action and comment are reflected
  TestValidator.equals(
    "updated moderation action",
    updatedModeration.action,
    moderationActionUpdated,
  );
  TestValidator.equals(
    "updated moderation comment",
    updatedModeration.comment,
    moderationCommentUpdated,
  );
}
