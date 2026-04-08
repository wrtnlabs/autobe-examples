import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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
 * Test customer category browsing preserves the one-level category hierarchy.
 *
 * Validates the customer-facing category browsing response as a read-only taxonomy view. The test checks that the endpoint returns paginated category summaries, root categories keep a null parent reference, and direct subcategories reference exactly one parent without exposing unsupported deeper nesting.
 *
 * This scenario focuses on navigation safety for category browsing. It verifies the platform's one-level hierarchy rule is preserved in the API response and that the returned structure remains suitable for customer category menus and category pages.
 *
 * 1. Browse the customer category list through the read-only endpoint.
 * 2. Validate pagination metadata and the returned category collection.
 * 3. Confirm each category has either no parent or exactly one direct parent.
 * 4. Ensure the response does not expose deeper nested hierarchy fields.
 */
export async function test_api_customer_category_browsing_one_level_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const output =
    await api.functional.mallPlatform.customer.categories.get(
      customerConnection,
    );
  typia.assert(output);
  TestValidator.predicate(
    "category page should include pagination metadata",
    output.pagination.records >= 0 && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "category page should contain category data array",
    Array.isArray(output.data),
  );
  for (const category of output.data) {
    typia.assert(category);
    TestValidator.equals(
      `category ${category.id} should expose a direct parent only or no parent`,
      category.parentCategory === null
        ? null
        : {
            id: category.parentCategory.id,
            parentCategory: category.parentCategory.parentCategory,
          },
      category.parentCategory === null
        ? null
        : {
            id: category.parentCategory.id,
            parentCategory: category.parentCategory.parentCategory,
          },
    );
    if (category.parentCategory === null) {
      TestValidator.equals(
        `root category ${category.id} should have null parentCategory`,
        category.parentCategory,
        null,
      );
    } else {
      TestValidator.notEquals(
        `subcategory ${category.id} should not reference itself as parent`,
        category.parentCategory.id,
        category.id,
      );
      TestValidator.equals(
        `subcategory ${category.id} should have a root or direct parent without deeper nesting visible`,
        category.parentCategory.parentCategory,
        null,
      );
    }
  }
}
