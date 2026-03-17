import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_admin_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for super administrator actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
    },
  );
  // Retrieve paginated administrator list with default settings
  const response = await api.functional.ecommerceMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  // Validate complete response structure including all type constraints
  typia.assert(response);
  // Validate pagination metadata consistency
  TestValidator.equals(
    "pages calculation matches records and limit",
    response.pagination.pages,
    response.pagination.limit > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0,
  );
  // Validate data array length does not exceed limit
  TestValidator.predicate(
    "data length within pagination limit",
    response.data.length <= response.pagination.limit,
  );
}
