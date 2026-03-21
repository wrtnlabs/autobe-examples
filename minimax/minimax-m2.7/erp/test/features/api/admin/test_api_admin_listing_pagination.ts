import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authenticated requests
  const adminConnection: api.IConnection = { host: connection.host };
  // Create 3 additional admin accounts for pagination testing
  for (let i = 0; i < 3; i++) {
    await authorize_admin_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmAdmin.IJoin,
    });
  }
  // Query page 1 with limit 2
  const page1 = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(page1);
  // Validate page 1 metadata
  TestValidator.predicate("records >= 4", page1.pagination.records >= 4);
  TestValidator.equals("current page", page1.pagination.current, 1);
  TestValidator.equals("limit", page1.pagination.limit, 2);
  TestValidator.equals("data length", page1.data.length, 2);
  // Query page 2 to verify continuation
  const page2 = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(page2);
  // Validate page 2 metadata
  TestValidator.equals("current page 2", page2.pagination.current, 2);
  TestValidator.equals("limit still 2", page2.pagination.limit, 2);
  TestValidator.predicate(
    "records match",
    page2.pagination.records === page1.pagination.records,
  );
  // Test maximum limit of 100
  const maxLimit = await api.functional.erpHrm.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(maxLimit);
  // Validate max limit response
  TestValidator.equals("limit 100", maxLimit.pagination.limit, 100);
}
