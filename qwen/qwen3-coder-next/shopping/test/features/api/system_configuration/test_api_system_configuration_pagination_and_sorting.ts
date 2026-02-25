import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfiguration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphabets(12), // Generate 12-character password for format validation
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test pagination with limit=5
  const page1 = await api.functional.shoppingMall.admin.configurations.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IShoppingMallSystemConfiguration.IRequest,
    },
  );
  typia.assert(page1);
  // Verify pagination metadata
  TestValidator.equals("page 1 pagination", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  TestValidator.predicate("page 1 has at most 5 items", page1.data.length <= 5);
  // 3. Test second page
  const page2 = await api.functional.shoppingMall.admin.configurations.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: 2,
      } satisfies IShoppingMallSystemConfiguration.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 pagination", page2.pagination.current, 2);
  TestValidator.predicate("page 2 has data", page2.data.length > 0);
  // 4. Test last page (should have partial results)
  const lastPage = await api.functional.shoppingMall.admin.configurations.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: page1.pagination.pages,
      } satisfies IShoppingMallSystemConfiguration.IRequest,
    },
  );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page pagination",
    lastPage.pagination.current,
    page1.pagination.pages,
  );
  // 5. Test page exceeding total pages (should return empty data but correct pagination)
  const overPage = await api.functional.shoppingMall.admin.configurations.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: page1.pagination.pages + 10,
      } satisfies IShoppingMallSystemConfiguration.IRequest,
    },
  );
  typia.assert(overPage);
  TestValidator.equals(
    "over page pagination",
    overPage.pagination.current,
    page1.pagination.pages + 10,
  );
  TestValidator.equals("over page data length", overPage.data.length, 0);
  // 6. Test sorting with pagination
  const sortedAsc =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          limit: 5,
          page: 1,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortedAsc);
  const sortedDesc =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          limit: 5,
          page: 1,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortedDesc);
  // 7. Test sort by config_key
  const sortedKeyAsc =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          sort_by: "config_key",
          sort_order: "asc",
          limit: 5,
          page: 1,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortedKeyAsc);
  const sortedKeyDesc =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          sort_by: "config_key",
          sort_order: "desc",
          limit: 5,
          page: 1,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortedKeyDesc);
  // 8. Test combined pagination and sorting
  const combined = await api.functional.shoppingMall.admin.configurations.index(
    adminConnection,
    {
      body: {
        config_key: "config",
        category: "test",
        is_enabled: true,
        page: 1,
        limit: 5,
        sort_by: "config_key",
        sort_order: "asc",
      } satisfies IShoppingMallSystemConfiguration.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.predicate("combined has data", combined.data.length > 0);
  TestValidator.equals("combined pagination", combined.pagination.limit, 5);
}
