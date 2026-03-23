import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 1: Get first page with limit=10
  const firstPage =
    await api.functional.ecommerceMall.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          limit: 10,
        } satisfies IEcommerceMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page has 10 records", firstPage.data.length, 10);
  TestValidator.equals("total records is 20", firstPage.pagination.records, 20);
  TestValidator.equals("total pages is 2", firstPage.pagination.pages, 2);
  // Step 2: Get second page with page=2, limit=10
  const secondPage =
    await api.functional.ecommerceMall.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page has remaining records",
    secondPage.data.length,
    10,
  );
  // Step 3: Get all records with page=1, limit=100
  const allRecords =
    await api.functional.ecommerceMall.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(allRecords);
  TestValidator.equals(
    "single page returns all records",
    allRecords.data.length,
    20,
  );
  TestValidator.equals(
    "single page for all records",
    allRecords.pagination.pages,
    1,
  );
  // Step 4: Call with limit=0 (should apply default limit=20)
  const defaultPage =
    await api.functional.ecommerceMall.admin.system_configurations.index(
      adminConnection,
      {
        body: { limit: 0 } satisfies IEcommerceMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals("limit=0 uses default 20", defaultPage.data.length, 20);
  TestValidator.equals(
    "default limit pagination",
    defaultPage.pagination.limit,
    20,
  );
}
