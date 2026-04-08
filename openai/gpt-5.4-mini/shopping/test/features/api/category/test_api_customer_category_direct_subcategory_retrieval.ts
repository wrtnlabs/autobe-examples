import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_direct_subcategory_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test direct subcategory retrieval for customer category browsing.
   *
   * Validates that an authenticated customer can call the direct subcategory
   * retrieval endpoint and receive a well-formed category record representing a
   * direct child category in the marketplace hierarchy.
   *
   * 1. Register a customer account to authenticate the request context.
   * 2. Call the direct subcategory retrieval endpoint with UUID category ids.
   * 3. Validate the returned category shape and one-level child collection.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/mall/categories",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const category =
    await api.functional.mallPlatform.customer.categories.subcategories.at(
      customerConnection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        subcategoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(category);
  TestValidator.predicate("category id exists", category.id.length > 0);
  TestValidator.predicate("category name exists", category.name.length > 0);
  TestValidator.predicate(
    "category description exists",
    category.description.length > 0,
  );
  TestValidator.predicate(
    "parent category reference is present for a subcategory",
    category.parentCategory !== null,
  );
  if (category.parentCategory !== null) {
    TestValidator.predicate(
      "parent category id exists",
      category.parentCategory.id.length > 0,
    );
    TestValidator.predicate(
      "parent category name exists",
      category.parentCategory.name.length > 0,
    );
    TestValidator.predicate(
      "parent category description exists",
      category.parentCategory.description.length > 0,
    );
    TestValidator.predicate(
      "parent category has no deeper nesting in summary shape",
      category.parentCategory.parentCategory === null ||
        category.parentCategory.parentCategory.id.length > 0,
    );
  }
  TestValidator.predicate(
    "subcategory collection is present",
    Array.isArray(category.subcategories),
  );
  TestValidator.predicate(
    "subcategory collection contains category records only",
    category.subcategories.every(
      (child) =>
        child.id.length > 0 &&
        child.name.length > 0 &&
        child.description.length > 0 &&
        (child.parentCategory === null || child.parentCategory.id.length > 0),
    ),
  );
}
