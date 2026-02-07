import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_variant_analytics_paginated_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Define pagination parameters
  const paginationData = {
    cursor: null,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallProductVariant.IRequest;
  // 3. Call analytics endpoint
  const result =
    await api.functional.shoppingMall.admin.admin.analytics.variants.index(
      adminConnection,
      { body: paginationData },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    result.pagination.limit,
    paginationData.limit,
  );
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Verify data consistency
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate(
    "data items are summaries",
    result.data.every((item) => typeof item === "object" && item !== null),
  );
  // 6. Validate pagination math
  if (result.pagination.limit > 0) {
    TestValidator.equals(
      "pages calculation matches records/limit",
      result.pagination.pages,
      Math.ceil(result.pagination.records / result.pagination.limit),
    );
  } else {
    TestValidator.equals(
      "pages should be 0 when limit is 0",
      result.pagination.pages,
      0,
    );
  }
}
