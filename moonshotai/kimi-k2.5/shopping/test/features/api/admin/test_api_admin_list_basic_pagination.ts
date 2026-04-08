import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Call list endpoint with empty filter criteria for default pagination
  const response = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {},
    },
  );
  // Step 3: Validate complete response structure including all type constraints
  typia.assert(response);
  // Step 4: Business logic validation - data length should not exceed limit
  TestValidator.predicate(
    "data length does not exceed page limit",
    response.data.length <= response.pagination.limit,
  );
  // Step 5: Business logic - if records exist, current page data should be returned
  if (response.pagination.records > 0 && response.pagination.pages >= 1) {
    // At least one page should have data if there are records
    TestValidator.predicate(
      "data contains items when records exist",
      response.data.length > 0 ||
        response.pagination.current > response.pagination.pages,
    );
  }
}
