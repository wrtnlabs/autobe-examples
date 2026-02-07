import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Admin login and setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test with different page sizes (1 to 100 - max limit)
  const testLimits = [1, 10, 50, 100] as const;
  for (const limit of testLimits) {
    // Generate paginated request
    const request: ICommunityPlatformSystemLog.IRequest = {
      page: 1,
      limit: limit,
    };
    // Call system logs endpoint
    const response: IPageICommunityPlatformSystemLog.ISummary =
      await api.functional.communityPlatform.admin.system.logs.index(
        adminConnection,
        {
          body: request,
        },
      );
    // Type validation
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page matches",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit matches requested limit",
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination records > 0",
      response.pagination.records > 0,
    );
    TestValidator.predicate(
      "pagination pages > 0",
      response.pagination.pages > 0,
    );
    // Validate data array has at least one record
    TestValidator.predicate("data array not empty", response.data.length > 0);
  }
}
