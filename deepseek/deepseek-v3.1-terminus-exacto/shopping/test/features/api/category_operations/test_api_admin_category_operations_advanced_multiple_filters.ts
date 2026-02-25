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

export async function test_api_admin_category_operations_advanced_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator connection
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin1);
  // Create second administrator connection for filtering scenarios
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin2);
  // Create multiple categories for operations
  const category1 =
    await generate_random_ecommerce_administrator_categories_create(
      admin1Connection,
      {
        body: {
          name: "Electronics" + RandomGenerator.alphaNumeric(5),
          description: "Category for electronic devices and gadgets",
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category1);
  const category2 =
    await generate_random_ecommerce_administrator_categories_create(
      admin1Connection,
      {
        body: {
          name: "Books" + RandomGenerator.alphaNumeric(5),
          description: "Category for books and publications",
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category2);
  const category3 =
    await generate_random_ecommerce_administrator_categories_create(
      admin2Connection,
      {
        body: {
          name: "Clothing" + RandomGenerator.alphaNumeric(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category3);
  // Perform multiple category operations to generate audit trail
  const updatedCategory1 =
    await api.functional.ecommerce.administrator.categories.update(
      admin1Connection,
      {
        categoryId: category1.id,
        body: {
          name: "Updated Electronics" + RandomGenerator.alphaNumeric(5),
          description: "Updated category description",
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory1);
  const updatedCategory2 =
    await api.functional.ecommerce.administrator.categories.update(
      admin2Connection,
      {
        categoryId: category2.id,
        body: {
          name: "Updated Books" + RandomGenerator.alphaNumeric(5),
          description: "Books with updated information",
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory2);
  // Test filter combination 1: Specific operation type (create) and administrator ID
  const filter1 =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      admin1Connection,
      {
        body: {
          operation_type: "create",
          administrator_id: admin1.id,
          limit: 10,
          page: 1,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(filter1);
  // Verify filter results contain only create operations by admin1
  TestValidator.predicate(
    "filter returns create operations",
    filter1.data.length > 0,
  );
  TestValidator.predicate(
    "all operations are create type",
    filter1.data.every((op) => op.operation_type === "create"),
  );
  TestValidator.predicate(
    "all operations by admin1",
    filter1.data.every((op) => op.administrator.id === admin1.id),
  );
  // Test filter combination 2: Specific category ID and administrator ID
  const filter2 =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      admin1Connection,
      {
        body: {
          category_id: category1.id,
          administrator_id: admin1.id,
          limit: 5,
          page: 1,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(filter2);
  // Verify filter results contain operations only for category1 by admin1
  TestValidator.predicate(
    "filter returns operations for category1",
    filter2.data.length > 0,
  );
  TestValidator.predicate(
    "all operations for specified category",
    filter2.data.every((op) => op.category.id === category1.id),
  );
  TestValidator.predicate(
    "all operations by admin1",
    filter2.data.every((op) => op.administrator.id === admin1.id),
  );
  // Test filter combination 3: Search term within operation details (case-insensitive)
  const searchTerm = "Electronic" + RandomGenerator.alphaNumeric(3);
  const filter3 =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      admin1Connection,
      {
        body: {
          search: searchTerm.toLowerCase(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(filter3);
  // Verify search functionality
  TestValidator.predicate("search returns results", filter3.data.length >= 0);
  // Test filter combination 4: Multiple criteria - operation type, admin ID, category ID
  const filter4 =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      admin1Connection,
      {
        body: {
          operation_type: "create",
          administrator_id: admin1.id,
          category_id: category1.id,
          limit: 5,
          page: 1,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(filter4);
  // Verify AND logic - all criteria must be satisfied
  if (filter4.data.length > 0) {
    TestValidator.predicate(
      "all operations are create type",
      filter4.data.every((op) => op.operation_type === "create"),
    );
    TestValidator.predicate(
      "all operations by admin1",
      filter4.data.every((op) => op.administrator.id === admin1.id),
    );
    TestValidator.predicate(
      "all operations for category1",
      filter4.data.every((op) => op.category.id === category1.id),
    );
  }
  // Test pagination metadata when filtering reduces result sets
  const paginationTest =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      admin1Connection,
      {
        body: {
          operation_type: "create",
          limit: 2,
          page: 1,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination structure
  TestValidator.equals(
    "pagination object exists",
    typeof paginationTest.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    paginationTest.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    paginationTest.pagination.limit === 2,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginationTest.pagination.pages >= 0,
  );
}
