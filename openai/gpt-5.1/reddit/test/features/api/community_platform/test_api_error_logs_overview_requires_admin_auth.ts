import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformErrorLogEnvironmentBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogEnvironmentBucket";
import type { ICommunityPlatformErrorLogOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogOverview";
import type { ICommunityPlatformErrorLogSample } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogSample";
import type { ICommunityPlatformErrorLogServiceOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogServiceOverview";
import type { ICommunityPlatformErrorLogSeverityBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogSeverityBucket";

export async function test_api_error_logs_overview_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by stripping headers
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 2. Verify that unauthenticated access to the overview endpoint fails
  await TestValidator.error(
    "unauthenticated admin error logs overview must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.errorLogs.overview.index(
        unauthenticated,
      );
    },
  );

  // 3. Join as a new adminUser (this will set Authorization header on `connection`)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 4. Call overview endpoint again with authenticated admin connection
  const overview: ICommunityPlatformErrorLogOverview =
    await api.functional.communityPlatform.adminUser.errorLogs.overview.index(
      connection,
    );
  typia.assert(overview);

  // 5. Basic business-level validations on overview content
  TestValidator.predicate(
    "totalErrorCount must be non-negative",
    overview.totalErrorCount >= 0,
  );

  TestValidator.predicate(
    "window.from is not empty ISO string",
    overview.window.from.length > 0,
  );

  TestValidator.predicate(
    "window.to is not empty ISO string",
    overview.window.to.length > 0,
  );

  // Distinguish behavior between unauthenticated and authenticated calls
  TestValidator.predicate(
    "overview severityBreakdown array is defined for authenticated call",
    Array.isArray(overview.severityBreakdown),
  );
}
