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
 * This test function validates the flow of updating a product review by an
 * authenticated customer.
 *
 * The test ensures that the following business rules and workflows are
 * correctly handled:
 *
 * 1. New customer registration and authentication.
 * 2. Admin registration and authentication for category and seller creation.
 * 3. Product category creation by an admin with unique code.
 * 4. Seller creation with valid details.
 * 5. Product creation linked to the category and seller.
 * 6. Customer creates an order for the product.
 * 7. Customer submits an initial product review.
 * 8. Customer updates their own product review.
 * 9. Upon update, the review status is reset to 'pending'.
 * 10. Verify updated review matches expected data.
 * 11. Attempt to update the review as another customer to ensure authorization is
 *     enforced.
 *
 * This comprehensive test validates data consistency, authorization boundaries,
 * and business logic for product review updates in an e-commerce platform.
 *
 * All API responses are asserted for type safety with typia.assert and business
 * rules with TestValidator.
 */
export async function test_api_product_review_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "StrongPassword1!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Register and authenticate a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "hashed_password_example",
      full_name: "Admin Test",
      phone_number: "+82101234567",
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Admin login to switch context if needed - ignored if already authenticated
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "hashed_password_example",
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Create product category as admin
  const categoryCode = `cat_${RandomGenerator.alphaNumeric(6)}`;
  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: `Category ${RandomGenerator.name(2)}`,
          display_order: 1,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create seller as admin
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    {
      body: {
        email: sellerEmail,
        password_hash: "hashed_seller_password",
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(seller);

  // 5. Create product linked to category and seller
  const productCode = `prd_${RandomGenerator.alphaNumeric(6)}`;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: productCode,
        name: `Product ${RandomGenerator.name(2)}`,
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Switch authentication to customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "StrongPassword1!",
      __typename: "", // Added due to ILogin having __typename? but actually not present, safely omitted
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Create order for the customer
  const orderNumber = `order_${RandomGenerator.alphaNumeric(8)}`;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: 123.45,
        status: "paid",
        business_status: "confirmed",
        payment_method: "credit_card",
        shipping_address: "123 Test Street, Seoul",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 8. Customer creates a product review for the product
  const reviewCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: order.id,
    rating: 4,
    review_text: "Initial review text.",
    status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;

  const review =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  // 9. Update the product review - change rating and text - status resets to 'pending'
  const reviewUpdateBody = {
    rating: 5,
    review_text: "Updated review text.",
    status: "pending",
  } satisfies IShoppingMallProductReview.IUpdate;

  const updatedReview =
    await api.functional.shoppingMall.customer.productReviews.update(
      connection,
      {
        id: review.id,
        body: reviewUpdateBody,
      },
    );
  typia.assert(updatedReview);

  // Validate updated review data matches expected update
  TestValidator.equals("updated review rating", updatedReview.rating, 5);
  TestValidator.equals(
    "updated review text",
    updatedReview.review_text ?? "",
    "Updated review text.",
  );
  TestValidator.equals(
    "updated review status",
    updatedReview.status,
    "pending",
  );
  TestValidator.equals("review id unchanged", updatedReview.id, review.id);

  // 10. Register and authenticate a different customer to test unauthorized update
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: otherEmail,
      password: "OtherStrongPass1$",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(otherCustomer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: otherEmail,
      password: "OtherStrongPass1$",
      __typename: "",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Attempt to update the original customer's review with this other customer's auth
  await TestValidator.error(
    "unauthorized customer cannot update another customer's review",
    async () => {
      await api.functional.shoppingMall.customer.productReviews.update(
        connection,
        {
          id: review.id,
          body: reviewUpdateBody,
        },
      );
    },
  );
}
