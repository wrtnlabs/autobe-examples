import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_article_category_update_by_customer(
  connection: api.IConnection,
) {
  // Authenticate admin (join + login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-login.example.com/",
      referrer: "https://admin-referrer.example.com/",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Authenticate customer (join + login)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustPass123!";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    full_name: RandomGenerator.name(),
    href: "https://customer-join.example.com/",
    referrer: "https://customer-referrer.example.com/",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer-login.example.com/",
      referrer: "https://customer-referrer.example.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Admin creates initial shopping mall article category
  const initialCategoryCreateBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const initialCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.admin.shoppingMallArticleCategories.create(
      connection,
      { body: initialCategoryCreateBody },
    );
  typia.assert(initialCategory);

  // Prepare update data for customer
  const updatedName = RandomGenerator.name(2);
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });

  // To update parent_id, create another category as parent
  const parentCategoryCreateBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const parentCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.admin.shoppingMallArticleCategories.create(
      connection,
      { body: parentCategoryCreateBody },
    );
  typia.assert(parentCategory);

  // Customer updates the category
  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    parent_id: parentCategory.id,
  } satisfies IShoppingMallArticleCategory.IUpdate;
  const updatedCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.update(
      connection,
      {
        shoppingMallArticleCategoryId: initialCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // Validate that the updated category response reflects the changes
  TestValidator.equals(
    "updated category id equals initial category id",
    updatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "updated category name matches",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "updated category description matches",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated category parent id matches new parent id",
    updatedCategory.parent_id,
    parentCategory.id,
  );
}
