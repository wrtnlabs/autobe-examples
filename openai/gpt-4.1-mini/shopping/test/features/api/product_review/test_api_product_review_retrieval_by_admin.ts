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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the retrieval of detailed product review information by admin users.
 *
 * This test performs a comprehensive sequence of operations reflecting
 * real-world scenarios in a shopping mall platform:
 *
 * 1. Admin user registration and authentication
 * 2. Customer user registration (two customers for review authorship diversity)
 * 3. Product category creation by admin
 * 4. Seller creation by admin
 * 5. Product creation linked to category and seller
 * 6. Order creation by first customer confirming purchase eligibility
 * 7. Product review creation by first customer for the ordered product
 * 8. Admin user retrieves the product review by ID
 * 9. Assertion of all review fields matching creation input and internal fields
 *
 * This scenario validates admin capabilities to access detailed review data
 * including all business-critical properties and relationships.
 */
export async function test_api_product_review_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
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

  // 2. Two customers join for review authorship
  const customerEmail1: string = typia.random<string & tags.Format<"email">>();
  const customer1Password: string = RandomGenerator.alphaNumeric(16);
  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail1,
        password: customer1Password,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer1);

  const customerEmail2: string = typia.random<string & tags.Format<"email">>();
  const customer2Password: string = RandomGenerator.alphaNumeric(16);
  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail2,
        password: customer2Password,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer2);

  // 3. Admin creates a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6).toUpperCase(),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Admin creates a seller
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        company_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Admin creates a product linked to category and seller
  const productCode: string = RandomGenerator.alphaNumeric(8).toUpperCase();
  const productName: string = RandomGenerator.name(3);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: productCode,
        name: productName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "Active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. First customer creates an order confirming purchase
  const orderNumber: string = `ORD-${RandomGenerator.alphaNumeric(10).toUpperCase()}`;
  const orderTotalPrice: number = typia.random<
    number & tags.Minimum<10> & tags.Maximum<1000>
  >();
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer1.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: "Paid",
        business_status: "Confirmed",
        payment_method: "CreditCard",
        shipping_address: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 7. First customer creates a product review for the product and order
  const reviewRating: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const reviewText: string = RandomGenerator.paragraph({ sentences: 10 });
  const reviewStatus: "pending" | "approved" | "rejected" = "pending";

  // Customer login with email and password
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail1,
      password: customer1Password,
    } satisfies IShoppingMallCustomer.IJoin,
  });

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer1.id,
          shopping_mall_product_id: product.id,
          shopping_mall_order_id: order.id,
          rating: reviewRating,
          review_text: reviewText,
          status: reviewStatus,
        } satisfies IShoppingMallProductReview.ICreate,
      },
    );
  typia.assert(review);

  // 8. Finally, admin retrieves the product review by ID
  const reviewRetrieved: IShoppingMallProductReview =
    await api.functional.shoppingMall.admin.productReviews.at(connection, {
      id: review.id,
    });
  typia.assert(reviewRetrieved);

  // 9. Assert fields
  TestValidator.equals(
    "product review id matches",
    reviewRetrieved.id,
    review.id,
  );
  TestValidator.equals(
    "customer id matches",
    reviewRetrieved.shopping_mall_customer_id,
    customer1.id,
  );
  TestValidator.equals(
    "product id matches",
    reviewRetrieved.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "order id matches",
    reviewRetrieved.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("rating matches", reviewRetrieved.rating, reviewRating);
  TestValidator.equals(
    "review text matches",
    reviewRetrieved.review_text,
    reviewText,
  );
  TestValidator.equals("status matches", reviewRetrieved.status, reviewStatus);
  TestValidator.predicate(
    "created_at is ISO datetime",
    typeof reviewRetrieved.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        reviewRetrieved.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    typeof reviewRetrieved.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        reviewRetrieved.updated_at,
      ),
  );
  TestValidator.equals("deleted_at is null", reviewRetrieved.deleted_at, null);
}
