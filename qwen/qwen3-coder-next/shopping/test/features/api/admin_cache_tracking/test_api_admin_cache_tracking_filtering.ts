import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemCacheTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemCacheTracking";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemCacheTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemCacheTracking";
import type { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_cache_tracking_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminUser = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminUser);
  // 2. Test cache tracking with filters
  const filters: IShoppingMallSystemCacheTracking.IRequest = {
    cache_key_pattern: "%product%",
    table_name: "shopping_mall_products",
    created_at_from: "2024-01-01T00:00:00Z",
    created_at_to: "2024-12-31T23:59:59Z",
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Maximum<100>
    >() satisfies number as number,
  };
  const result = await api.functional.shoppingMall.admin.cache_trackings.index(
    adminConnection,
    { body: filters },
  );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.equals("has pagination", result.pagination !== undefined, true);
  TestValidator.predicate("has data array", Array.isArray(result.data));
  TestValidator.predicate("has records count", result.pagination.records >= 0);
  // 4. Validate cache tracking items structure
  for (const item of result.data) {
    TestValidator.equals("item has id", item.id !== undefined, true);
    TestValidator.equals(
      "item has cache_key_pattern",
      item.cache_key_pattern !== undefined,
      true,
    );
    TestValidator.equals(
      "item has description",
      item.description !== undefined,
      true,
    );
    TestValidator.equals(
      "item has invalidated_at",
      item.invalidated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "item has table_name",
      item.table_name !== undefined,
      true,
    );
    TestValidator.predicate(
      "table_name has id",
      item.table_name.id !== undefined,
    );
    TestValidator.predicate(
      "table_name has name",
      item.table_name.name !== undefined,
    );
    TestValidator.predicate(
      "table_name has value",
      item.table_name.value !== undefined,
    );
    TestValidator.predicate(
      "table_name has label",
      item.table_name.label !== undefined,
    );
    TestValidator.equals(
      "item has admin or null",
      item.admin === null || item.admin !== undefined,
      true,
    );
  }
}
