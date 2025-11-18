import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRatingAggregate";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that rating aggregates for a newly created product with no reviews
 * expose a coherent "no ratings yet" representation and are publicly accessible
 * without authentication.
 *
 * End-to-end flow:
 *
 * 1. Register a seller account (self-join) to own the product.
 * 2. Register an admin account and login to obtain admin context.
 * 3. As admin, create a catalog category.
 * 4. Switch to seller, create a product owned by the seller.
 * 5. Switch back to admin, link the product to the created category.
 * 6. From an unauthenticated connection, call GET
 *    /shoppingMall/products/{productId}/ratingAggregates.
 * 7. Assert that the aggregate structure matches
 *    IShoppingMallProductRatingAggregate and that, for a product with no
 *    reviews, rating_count==0, all rating_*_count==0, average_rating===null,
 *    last_computed_at is a valid timestamp, and the product linkage matches.
 */
export async function test_api_product_rating_aggregates_initial_zero_state(
  connection: api.IConnection,
) {
  // 1. Seller self-registration
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;

  // 2. Admin registration and login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;

  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-referrer",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginResult);

  // 3. Create a category as admin
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Seller login and product creation
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login-referrer",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginResult);

  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  const productId = product.id;

  // 5. Switch back to admin and link product to category
  const adminReloginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login-again",
    referrer: "https://admin.example.com/login-again-referrer",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminReloginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminReloginResult);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategoryLink);

  // 6. Build unauthenticated connection and fetch rating aggregates
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const aggregate: IShoppingMallProductRatingAggregate =
    await api.functional.shoppingMall.products.ratingAggregates.at(
      unauthenticatedConnection,
      {
        productId,
      },
    );
  typia.assert<IShoppingMallProductRatingAggregate>(aggregate);

  // 7. Business assertions for initial zero-state aggregates
  TestValidator.equals(
    "aggregate.product linkage matches created product",
    aggregate.shopping_mall_product_id,
    productId,
  );

  TestValidator.equals(
    "rating_count should be zero for new product",
    aggregate.rating_count,
    0,
  );

  TestValidator.equals(
    "rating_1_count should be zero for new product",
    aggregate.rating_1_count,
    0,
  );
  TestValidator.equals(
    "rating_2_count should be zero for new product",
    aggregate.rating_2_count,
    0,
  );
  TestValidator.equals(
    "rating_3_count should be zero for new product",
    aggregate.rating_3_count,
    0,
  );
  TestValidator.equals(
    "rating_4_count should be zero for new product",
    aggregate.rating_4_count,
    0,
  );
  TestValidator.equals(
    "rating_5_count should be zero for new product",
    aggregate.rating_5_count,
    0,
  );

  TestValidator.equals(
    "average_rating should be null when there are no reviews",
    aggregate.average_rating,
    null,
  );

  TestValidator.predicate(
    "last_computed_at must be a non-empty ISO date-time string",
    aggregate.last_computed_at.length > 0,
  );
}
