import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModeration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_review_moderation_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signup and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword, // hashed by backend
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer signup
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustPass123!";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Create product category
  const categoryCreateBody = {
    parent_id: null,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: RandomGenerator.pick([1, 5, 10, 20]),
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Create seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "SellerPass123!",
    company_name: RandomGenerator.name(3),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 5. Create product
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "Active",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Create order for product by customer
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    total_price: 199.99,
    status: "Pending",
    business_status: "Processing",
    payment_method: "Credit Card",
    shipping_address: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Create product review by customer
  const reviewCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: order.id,
    rating: RandomGenerator.pick([1, 2, 3, 4, 5]),
    review_text: RandomGenerator.paragraph({ sentences: 4 }),
    status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;
  const productReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: reviewCreateBody,
      },
    );
  typia.assert(productReview);

  // 8. Admin authenticates again (simulate role switch)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Prepare filter, sort and pagination request body
  const moderationRequestBody = {
    filter: {
      shopping_mall_product_review_id: productReview.id,
      shopping_mall_admin_id: undefined,
      action: undefined,
    },
    sort: [
      {
        property: "created_at",
        direction: "desc",
      },
    ],
    pagination: {
      page: 1,
      pageSize: 10,
    },
  } satisfies IShoppingMallReviewModeration.IRequest;

  // 9. Retrieve the moderation records page
  const moderationList: IPageIShoppingMallReviewModeration =
    await api.functional.shoppingMall.admin.productReviews.reviewModerations.index(
      connection,
      {
        productReviewId: productReview.id,
        body: moderationRequestBody,
      },
    );
  typia.assert(moderationList);

  // 10. Validate pagination info
  TestValidator.predicate(
    "pagination current page should be 1",
    moderationList.pagination.current === 1,
  );
  TestValidator.predicate(
    "page size should be 10",
    moderationList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "moderation data array should be an array",
    Array.isArray(moderationList.data),
  );

  // 11. Validate all returned records apply to the requested review id
  moderationList.data.forEach((moderation) => {
    TestValidator.equals(
      "moderation.productReviewId matches requested productReviewId",
      moderation.shopping_mall_product_review_id,
      productReview.id,
    );
  });
}
