import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test retrieving a paginated list of all product categories with default parameters.
 * Verify the response contains a properly structured paginated result with category summaries.
 * Validate pagination metadata shows correct current page, limit, total records, and total pages.
 */
export async function test_api_category_list_pagination(
  connection: api.IConnection,
) {
  // 1. Setup: Create admin connection using join utility
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create 15 test categories for pagination testing using utility function
  const createdCategories: IEcommerceMallCategory[] = [];
  for (let i = 0; i < 15; i++) {
    const category =
      await generate_random_ecommerce_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            name: `Category ${i + 1} - ${RandomGenerator.alphabets(5)}`,
            description: RandomGenerator.content({ paragraphs: 1 }),
          },
        },
      );
    typia.assert(category);
    createdCategories.push(category);
  }
  // 3. Test: Page 1 with limit 10
  const page1: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(page1);
  // 4. Validate page 1 pagination structure
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1.data.length <= 10,
  );
  TestValidator.predicate(
    "page 1 total records >= 15",
    page1.pagination.records >= 15,
  );
  TestValidator.predicate(
    "page 1 total pages >= 2",
    page1.pagination.pages >= 2,
  );
  // 5. Test: Page 2 with limit 10
  const page2: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(page2);
  // 6. Validate page 2
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 7. Test: Custom limit of 5 on page 1
  const page1Limit5: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(page1Limit5);
  // 8. Validate custom limit
  TestValidator.equals(
    "page 1 limit 5 has correct limit",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 1 limit 5 data length <= 5",
    page1Limit5.data.length <= 5,
  );
  // 9. Test: Page beyond total (expected: boundary behavior)
  const farPage: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        page: 100,
        limit: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(farPage);
  // 10. Validate far page structure
  TestValidator.equals("far page current", farPage.pagination.current, 100);
  TestValidator.equals("far page limit", farPage.pagination.limit, 10);
  // 11. Verify category data structure and no duplicates across pages
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = new Set(page1.data.map((c) => c.id));
    const page2Ids = new Set(page2.data.map((c) => c.id));
    const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
    TestValidator.equals(
      "no duplicate categories across pages",
      intersection.length,
      0,
    );
  }
  // 12. Verify category summary structure
  if (page1.data.length > 0) {
    const firstCategory = page1.data[0]!;
    typia.assert(firstCategory);
    TestValidator.predicate(
      "category has valid uuid id",
      typeof firstCategory.id === "string",
    );
    TestValidator.predicate(
      "category has name",
      typeof firstCategory.name === "string",
    );
    TestValidator.predicate(
      "category has description field",
      firstCategory.description === null ||
        typeof firstCategory.description === "string",
    );
    TestValidator.predicate(
      "category has createdAt",
      typeof firstCategory.createdAt === "string",
    );
    TestValidator.predicate(
      "category has parent field",
      firstCategory.parent === null || typeof firstCategory.parent === "object",
    );
  }
}
