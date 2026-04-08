import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_guest_super_admin_query_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Execution: Query guest sessions with pagination
  const response = await api.functional.ecommerceMall.superAdmin.guests.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validation: Pagination metadata matches request
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", response.pagination.limit, 10);
  // 4. Validation: Data array length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 5. Validation: If no records exist, data should be empty
  if (response.pagination.records === 0) {
    TestValidator.predicate(
      "data is empty when records is 0",
      response.data.length === 0,
    );
  }
}
