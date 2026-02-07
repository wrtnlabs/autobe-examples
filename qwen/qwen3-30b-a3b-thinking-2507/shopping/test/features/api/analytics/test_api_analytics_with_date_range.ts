import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_analytics_with_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // Generate date range: max 30 days (current date to 30 days ago)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Make the analytics request
  const response = await api.functional.ecommerce.admin.configs.analytics.index(
    adminConnection,
    {
      body: {
        created_at_min: thirtyDaysAgo.toISOString(),
        created_at_max: now.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IEcommerceSystemConfig.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 50",
    response.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination records should be ≥ 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be ≥ 0",
    response.pagination.pages >= 0,
  );
}
