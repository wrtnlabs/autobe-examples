import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameterDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_admin_category_operations_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create initial categories to generate operations
  const categories: IEcommerceCategory[] = [];
  for (let i = 0; i < 3; i++) {
    const category =
      await generate_random_ecommerce_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 2,
              wordMax: 4,
            }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(category);
    categories.push(category);
  }
  // 3. Perform updates at different times (simulated by immediate calls)
  const updatedCategories: IEcommerceCategory[] = [];
  for (const category of categories) {
    const updated =
      await api.functional.ecommerce.administrator.categories.update(
        adminConnection,
        {
          categoryId: category.id,
          body: {
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 2,
              wordMax: 4,
            }),
            description: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies IEcommerceCategory.IUpdate,
        },
      );
    typia.assert(updated);
    updatedCategories.push(updated);
  }
  // Wait a moment to ensure timestamps differ (simulate operations across time)
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Test date range filtering
  // Get all operations to establish baseline
  const allOperations =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(allOperations);
  TestValidator.predicate(
    "should have operations",
    allOperations.data.length > 0,
  );
  // Test case a: Exact date matches - filter by today
  const today = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayOperations =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {
          created_at_from: todayStart.toISOString(),
          created_at_to: todayEnd.toISOString(),
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(todayOperations);
  TestValidator.predicate(
    "should have operations today",
    todayOperations.data.length > 0,
  );
  // Test case b: Missing start date (all operations before end date)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const beforeFuture =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {
          created_at_to: futureDate.toISOString(),
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(beforeFuture);
  TestValidator.equals(
    "all operations before future date",
    beforeFuture.data.length,
    allOperations.data.length,
  );
  // Test case c: Missing end date (all operations after past date)
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const afterPast =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {
          created_at_from: pastDate.toISOString(),
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(afterPast);
  TestValidator.equals(
    "all operations after past date",
    afterPast.data.length,
    allOperations.data.length,
  );
  // Test case d: Invalid date range (start after end)
  const invalidRange =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
          created_at_to: pastDate.toISOString(),
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(invalidRange);
  TestValidator.equals(
    "invalid date range returns empty",
    invalidRange.data.length,
    0,
  );
  // Test case e: Combined filtering with operation_type
  const editOperations =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {
          operation_type: "edit",
          created_at_from: pastDate.toISOString(),
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(editOperations);
  TestValidator.predicate(
    "edit operations exist",
    editOperations.data.length >= categories.length,
  );
  // Test case f: Pagination with date filtering
  const paginated =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {
          created_at_from: pastDate.toISOString(),
          page: 1,
          limit: 1,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("paginated limit matches", paginated.data.length, 1);
  TestValidator.predicate(
    "pagination metadata valid",
    paginated.pagination.current === 1 &&
      paginated.pagination.limit === 1 &&
      paginated.pagination.records >= paginated.data.length &&
      paginated.pagination.pages >= 1,
  );
  // Validate timestamp includes both date and time components
  if (todayOperations.data.length > 0) {
    const operation = todayOperations.data[0];
    TestValidator.predicate(
      "created_at is valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(operation.created_at),
    );
  }
}
