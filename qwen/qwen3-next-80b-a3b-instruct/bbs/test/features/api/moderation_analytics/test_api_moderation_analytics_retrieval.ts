import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumModerationFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumModerationFlag";
import type { IEconomicForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostReport";
import type { IEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumSystemAudit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Define pagination parameters for the request
  const requestPayload: IEconomicForumModerationFlag = {
    pagination: {
      page: 1,
      limit: 20,
    },
  } satisfies IEconomicForumModerationFlag;
  // Call moderation analytics endpoint with pagination
  const response: IEconomicForumSystemAudit =
    await api.functional.economicForum.admin.system.analytics.moderation.index(
      adminConnection,
      {
        body: requestPayload,
      },
    );
  typia.assert(response);
  // Validate response structure according to IEconomicForumSystemAudit
  TestValidator.predicate(
    "totalReports is non-negative",
    response.totalReports >= 0,
  );
  TestValidator.predicate(
    "totalApproved is non-negative",
    response.totalApproved >= 0,
  );
  TestValidator.predicate(
    "totalDeleted is non-negative",
    response.totalDeleted >= 0,
  );
  TestValidator.predicate(
    "averageResponseTime is non-negative",
    response.averageResponseTime >= 0,
  );
  TestValidator.predicate(
    "topReportReasons is an array",
    Array.isArray(response.topReportReasons),
  );
  TestValidator.predicate(
    "topReportReasons has at most 5 items",
    response.topReportReasons.length <= 5,
  );
  TestValidator.equals(
    "pagination page matches request",
    response.pagination.current,
    requestPayload.pagination.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    requestPayload.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
}
