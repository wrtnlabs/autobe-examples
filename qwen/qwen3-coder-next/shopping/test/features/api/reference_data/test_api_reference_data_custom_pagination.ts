import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemReferenceData";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reference_data_custom_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test custom pagination parameters
  const output = await api.functional.shoppingMall.admin.reference_data.index(
    adminConnection,
    {
      body: {
        page: 3,
        limit: 15,
      } satisfies IShoppingMallSystemReferenceData.IRequest,
    },
  );
  typia.assert(output);
  // Validate pagination structure with complete pagination object
  TestValidator.equals("pagination exists", output.pagination, {
    current: 3,
    limit: 15,
    records: output.pagination.records,
    pages: output.pagination.pages,
  } satisfies IPage.IPagination);
  // Validate pagination counts
  TestValidator.predicate(
    "has valid record count",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    output.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("has valid data array", Array.isArray(output.data));
  TestValidator.predicate(
    "data count matches pagination or is last page",
    output.data.length === output.pagination.limit ||
      output.data.length ===
        output.pagination.records % output.pagination.limit,
  );
}