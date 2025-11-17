import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_category_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account to authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = `https://${RandomGenerator.alphabets(12)}.com/${RandomGenerator.alphabets(6)}`;
  const referrer = `https://${RandomGenerator.alphabets(10)}.net/${RandomGenerator.alphabets(8)}`;
  const customerCreateBody = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerCreateBody,
    },
  );
  typia.assert(customerAuthorized);

  // 2. Create a new shopping mall category authenticated as the customer
  // Generate unique category name with underscores substituting spaces
  const categoryName = RandomGenerator.name(2).replace(/\s+/g, "_");
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const categoryStatus = "active"; // String status as per schema
  const categoryCreateBody = {
    name: categoryName,
    description: categoryDescription,
    status: categoryStatus,
  } satisfies IShoppingMallShoppingMallCategory.ICreate;

  const category =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Validate returned category fields to ensure correctness
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryCreateBody.name,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryCreateBody.description,
  );
  TestValidator.equals(
    "category status matches input",
    category.status,
    categoryCreateBody.status,
  );

  TestValidator.predicate(
    "category id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );

  TestValidator.predicate(
    "created_at is a valid ISO 8601 date string",
    !isNaN(Date.parse(category.created_at)),
  );

  TestValidator.predicate(
    "updated_at is a valid ISO 8601 date string",
    !isNaN(Date.parse(category.updated_at)),
  );

  TestValidator.predicate(
    "deleted_at is null or undefined",
    category.deleted_at === null || category.deleted_at === undefined,
  );
}
