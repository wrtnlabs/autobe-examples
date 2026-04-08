import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer category browsing with top-level and subcategory pagination.
 *
 * Validates that authenticated customers can browse the public category tree
 * with the one-level nesting rule enforced correctly. It checks top-level
 * categories, direct subcategories, keyword search filtering, empty-result
 * handling, and the exclusion of soft-deleted categories from customer-facing
 * listings.
 *
 * 1. Register and authenticate a customer account using an isolated connection.
 * 2. Browse top-level categories and verify pagination metadata and summary fields.
 * 3. Browse a known parent category to confirm only direct children are returned.
 * 4. Verify search filtering and empty-match behavior.
 * 5. Ensure deleted categories are not included in the customer browse result.
 */
export async function test_api_customer_categories_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const topLevelResponse =
    await api.functional.mallPlatform.customer.categories.index(
      customerConnection,
      {
        body: {
          parentCategoryId: null,
          page: 1,
          limit: 100,
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(topLevelResponse);
  TestValidator.predicate(
    "top-level category response has pagination",
    topLevelResponse.pagination.current >= 1 &&
      topLevelResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "top-level category response has non-negative totals",
    topLevelResponse.pagination.records >= 0 &&
      topLevelResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "top-level categories are returned as summaries",
    topLevelResponse.data.every((category) => category.parentCategory === null),
  );
  const topLevelSample = topLevelResponse.data[0];
  if (topLevelSample !== undefined) {
    TestValidator.predicate(
      "top-level category summary exposes expected fields",
      typeof topLevelSample.id === "string" &&
        typeof topLevelSample.name === "string" &&
        typeof topLevelSample.description === "string" &&
        typeof topLevelSample.created_at === "string" &&
        typeof topLevelSample.updated_at === "string" &&
        (topLevelSample.deleted_at === null ||
          typeof topLevelSample.deleted_at === "string") &&
        topLevelSample.parentCategory === null,
    );
  }
  const parentCategory = topLevelResponse.data.find(
    (category) => category.parentCategory === null,
  );
  if (parentCategory !== undefined) {
    const subcategoryResponse =
      await api.functional.mallPlatform.customer.categories.index(
        customerConnection,
        {
          body: {
            parentCategoryId: parentCategory.id,
            page: 1,
            limit: 100,
          } satisfies IMallPlatformCategory.IRequest,
        },
      );
    typia.assert(subcategoryResponse);
    TestValidator.predicate(
      "subcategory browse returns direct children only",
      subcategoryResponse.data.every(
        (category) =>
          category.parentCategory !== null &&
          category.parentCategory.id === parentCategory.id,
      ),
    );
    TestValidator.predicate(
      "subcategory browse keeps taxonomy one level deep",
      subcategoryResponse.data.every(
        (category) => category.parentCategory?.parentCategory === null,
      ),
    );
  }
  const searchKeyword = topLevelSample?.name ?? RandomGenerator.alphabets(8);
  const searchResponse =
    await api.functional.mallPlatform.customer.categories.index(
      customerConnection,
      {
        body: {
          parentCategoryId: null,
          search: searchKeyword,
          page: 1,
          limit: 100,
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search filter narrows results by category name",
    searchResponse.data.every((category) =>
      category.name.includes(searchKeyword),
    ),
  );
  TestValidator.predicate(
    "search results do not include deleted categories",
    searchResponse.data.every((category) => category.deleted_at === null),
  );
  const emptyResponse =
    await api.functional.mallPlatform.customer.categories.index(
      customerConnection,
      {
        body: {
          parentCategoryId: null,
          search: RandomGenerator.alphabets(24),
          page: 1,
          limit: 100,
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty search returns an empty page",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records are zero",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages are zero",
    emptyResponse.pagination.pages,
    0,
  );
}
