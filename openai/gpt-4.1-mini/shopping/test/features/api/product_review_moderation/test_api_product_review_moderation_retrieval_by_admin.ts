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
 * Validate product review moderation retrieval by admin.
 *
 * This test performs the full workflow for an administrator to retrieve a
 * specific moderation record of a product review in the shopping mall platform.
 * It covers account creation for admin, customer, category, seller, product,
 * order, and product review creation to set up the environment.
 *
 * The admin then creates a moderation record for the review, and this record is
 * retrieved and validated for correctness.
 *
 * The test also verifies error handling when fetching a non-existent moderation
 * ID and enforces proper authorization to ensure only admins access moderation
 * records.
 *
 * Steps:
 *
 * 1. Admin account creation and authentication.
 * 2. Customer creation and authentication.
 * 3. Create product category.
 * 4. Create seller account.
 * 5. Create product.
 * 6. Create order confirming purchase.
 * 7. Create a product review by the customer.
 * 8. Admin creates a moderation record for the product review.
 * 9. Admin retrieves the moderation record and verifies data accuracy.
 * 10. Test error on retrieving non-existent moderation ID.
 * 11. Test unauthorized access denial by customer on moderation retrieval.
 */
export async function test_api_product_review_moderation_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin account creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePass123!";
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

  // 2. Admin login for role switching
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
      remember_me: true,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Customer creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "custPass456@";
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

  // 4. Customer login for role switching
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      __typename: "",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 6. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = "sellerPass789$";
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 7. Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 8. Create order confirming purchase
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: `ORD-${RandomGenerator.alphaNumeric(6)}`,
        total_price: 1000,
        status: "pending",
        business_status: "new",
        payment_method: "credit_card",
        shipping_address: "123 Test St, Test City",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 9. Create a product review by the customer
  const productReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_product_id: product.id,
          shopping_mall_order_id: order.id,
          rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
          review_text: RandomGenerator.paragraph({ sentences: 4 }),
          status: "pending",
        } satisfies IShoppingMallProductReview.ICreate,
      },
    );
  typia.assert(productReview);

  // 10. Switch to admin login for role switching
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
      remember_me: true,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 11. Admin creates a moderation record for the product review
  const moderationAction = RandomGenerator.pick([
    "approve",
    "reject",
    "flag",
  ] as const);
  const moderationComment = RandomGenerator.paragraph({ sentences: 2 });
  const moderation: IShoppingMallReviewModeration =
    await api.functional.shoppingMall.admin.productReviews.reviewModerations.create(
      connection,
      {
        productReviewId: productReview.id,
        body: {
          shopping_mall_product_review_id: productReview.id,
          shopping_mall_admin_id: admin.id,
          action: moderationAction,
          comment: moderationComment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } satisfies IShoppingMallReviewModeration.ICreate,
      },
    );
  typia.assert(moderation);

  // 12. Admin retrieves the moderation record and verifies data accuracy
  const loadedModeration: IShoppingMallReviewModeration =
    await api.functional.shoppingMall.admin.productReviews.reviewModerations.at(
      connection,
      {
        productReviewId: productReview.id,
        id: moderation.id,
      },
    );
  typia.assert(loadedModeration);
  TestValidator.equals(
    "moderation id matches",
    loadedModeration.id,
    moderation.id,
  );
  TestValidator.equals(
    "moderation action matches",
    loadedModeration.action,
    moderation.action,
  );
  TestValidator.equals(
    "moderation comment matches",
    loadedModeration.comment,
    moderation.comment,
  );
  TestValidator.equals(
    "moderation admin id matches",
    loadedModeration.shopping_mall_admin_id,
    moderation.shopping_mall_admin_id,
  );
  TestValidator.equals(
    "moderation product review id matches",
    loadedModeration.shopping_mall_product_review_id,
    moderation.shopping_mall_product_review_id,
  );

  // 13. Test error on retrieving non-existent moderation ID
  await TestValidator.error(
    "fetching invalid moderation id should fail",
    async () => {
      await api.functional.shoppingMall.admin.productReviews.reviewModerations.at(
        connection,
        {
          productReviewId: productReview.id,
          id: typia.random<string & tags.Format<"uuid">>(), // random unrelated ID
        },
      );
    },
  );

  // 14. Switch to customer login to test unauthorized access
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      __typename: "",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 15. Test unauthorized access denial for customer retrieving moderation
  await TestValidator.error(
    "customer cannot access moderation record",
    async () => {
      await api.functional.shoppingMall.admin.productReviews.reviewModerations.at(
        connection,
        {
          productReviewId: productReview.id,
          id: moderation.id,
        },
      );
    },
  );
}
