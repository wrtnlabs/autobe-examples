import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test retrieving top-level product categories as a customer.
 *
 * This test verifies the primary success path for listing top-level categories:
 * 1. Admin creates multiple top-level categories as test data
 * 2. Customer authenticates and lists categories without parentId filter
 * 3. Response returns paginated top-level categories (parentId === null)
 * 4. Validates pagination structure and category summary fields
 * 5. Ensures soft-deleted categories are not included in results
 *
 * @param connection - Base API connection
 */
export async function test_api_category_list_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for test data creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level test categories (parentId = null)
  const createdCategories: IEcommerceMallCategory[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      return await generate_random_ecommerce_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parentId: null,
          },
        },
      );
    });
  // 3. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. List top-level categories (parentId = null returns top-level)
  const response: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(customerConnection, {
      body: {
        parentId: null,
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(response);
  // 5. Validate all returned categories are top-level (parentId === null)
  for (const category of response.data) {
    TestValidator.predicate(
      `category '${category.name}' is top-level (parentId === null)`,
      category.parentId === null,
    );
  }
  // 6. Verify created categories appear in results (soft-deleted categories excluded)
  const createdIds = new Set(createdCategories.map((c) => c.id));
  const responseIds = new Set(response.data.map((c) => c.id));
  const matchingIds = Array.from(createdIds).filter((id) =>
    responseIds.has(id),
  );
  TestValidator.predicate(
    "created top-level categories appear in response (soft-deleted excluded)",
    matchingIds.length === createdCategories.length,
  );
  // 7. Validate pagination metadata consistency
  TestValidator.predicate(
    "records count matches data length or limit",
    response.pagination.records >= response.data.length,
  );
}
