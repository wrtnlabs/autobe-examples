import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_metrics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Admin connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Request with explicit pagination
  const request: ICommunityPlatformSystemMetric.IRequest = {
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    page: 2,
    limit: 15,
  };
  // Execute metrics request
  const output: IPageICommunityPlatformSystemMetric.ISummary =
    await api.functional.communityPlatform.admin.system.metrics.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  // Validation
  TestValidator.equals("page size", output.data.length, 15);
  TestValidator.predicate(
    "total records > page size",
    output.pagination.records > 15,
  );
  TestValidator.equals("current page", output.pagination.current, 2);
  TestValidator.equals("limit", output.pagination.limit, 15);
  TestValidator.equals("total pages > 1", output.pagination.pages > 1, true);
}