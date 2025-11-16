import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Tests the workflow of authenticated customers creating shopping mall article
 * categories.
 *
 * 1. Customer registration and authentication.
 * 2. Creating a top-level category (no parent).
 * 3. Creating a child category referencing the first category.
 * 4. Validates API response types and business properties.
 * 5. Tests creation failures for unauthenticated requests.
 * 6. Tests creation failures for invalid category data.
 */
export async function test_api_shopping_mall_article_category_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Abc123!@#",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/referral",
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customerAuthorized);

  // 2. Create a top-level category
  const cat1Input = {
    name: `Category ${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 6 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const category1 =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      {
        body: cat1Input,
      },
    );
  typia.assert(category1);
  TestValidator.equals(
    "Created category's name matches input",
    category1.name,
    cat1Input.name,
  );
  TestValidator.equals(
    "Created category has null parent_id",
    category1.parent_id,
    null,
  );

  // 3. Create a child category using parent_id of the first
  const cat2Input = {
    name: `Child Category ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 6 })}`,
    description: null,
    parent_id: category1.id,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const category2 =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      {
        body: cat2Input,
      },
    );
  typia.assert(category2);
  TestValidator.equals(
    "Child category's parent_id matches parent id",
    category2.parent_id,
    category1.id,
  );

  // 4. Test creation failure due to unauthenticated state (without proper auth token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthorized category creation should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
        unauthConnection,
        {
          body: {
            name: "Unauthorized category",
            description: null,
            parent_id: null,
          } satisfies IShoppingMallArticleCategory.ICreate,
        },
      );
    },
  );

  // 5. Test creation failure due to invalid data: missing name (empty string)
  await TestValidator.error(
    "Category creation with empty name should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
        connection,
        {
          body: {
            name: "",
            description: "Invalid category",
            parent_id: null,
          } satisfies IShoppingMallArticleCategory.ICreate,
        },
      );
    },
  );
}
