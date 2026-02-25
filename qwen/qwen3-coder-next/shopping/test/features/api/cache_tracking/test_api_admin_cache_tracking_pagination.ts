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

export async function test_api_admin_cache_tracking_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Step 2: Test pagination endpoint - retrieve first page of cache invalidation tracking
  const result = await api.functional.shoppingMall.admin.cache_trackings.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSystemCacheTracking.IRequest,
    },
  );
  typia.assert(result);
  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof result.pagination.pages === "number",
  );
  // Step 4: Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  TestValidator.equals(
    "data length matches pagination records",
    result.data.length,
    result.pagination.records,
  );
  // Step 5: Validate individual cache tracking record structure if data exists
  if (result.data.length > 0) {
    const firstRecord = result.data[0];
    typia.assert<IShoppingMallSystemCacheTracking.ISummary>(firstRecord);
    TestValidator.predicate(
      "record has id",
      typeof firstRecord.id === "string",
    );
    TestValidator.predicate(
      "record has cache_key_pattern",
      typeof firstRecord.cache_key_pattern === "string",
    );
    TestValidator.predicate(
      "record has description",
      typeof firstRecord.description === "string",
    );
    TestValidator.predicate(
      "record has invalidated_at",
      typeof firstRecord.invalidated_at === "string",
    );
    TestValidator.predicate(
      "record has table_name",
      typeof firstRecord.table_name === "object",
    );
    TestValidator.predicate(
      "record has admin",
      firstRecord.admin === null || typeof firstRecord.admin === "object",
    );
  }
}
