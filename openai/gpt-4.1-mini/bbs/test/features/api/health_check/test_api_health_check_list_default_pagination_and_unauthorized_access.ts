import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_health_check_list_default_pagination_and_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving system health check records with default pagination and unauthorized access.
  // 1. Authenticate as super administrator using join utility.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 2. Prepare empty filter request (no filters applied, default pagination used).
  const requestBody: IDiscussionBoardHealthCheck.IRequest = {
    status: null,
    checkedAfter: null,
    checkedBefore: null,
    page: null,
    limit: null,
  };
  // 3. Call healthChecks.index endpoint with super admin connection and empty filters.
  const healthCheckPage =
    await api.functional.discussionBoard.superAdministrator.healthChecks.index(
      superAdminConnection,
      { body: requestBody },
    );
  // 4. Validate the response.
  typia.assert(healthCheckPage);
  // 5. Validate pagination metadata indicates total records, pages, current page, and limit.
  TestValidator.predicate(
    "pagination contains records",
    healthCheckPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    healthCheckPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page >= 0",
    healthCheckPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    healthCheckPage.pagination.limit >= 0,
  );
  // 6. Validate that every health check record has required fields.
  for (const record of healthCheckPage.data) {
    TestValidator.predicate(
      "healthCheck has id",
      typeof record.id === "string",
    );
    TestValidator.predicate(
      "healthCheck has status",
      typeof record.status === "string",
    );
    TestValidator.predicate(
      "healthCheck has checkedAt",
      typeof record.checkedAt === "string",
    );
    // details can be null or string
    TestValidator.predicate(
      "healthCheck has details",
      record.details === null || typeof record.details === "string",
    );
    TestValidator.predicate(
      "healthCheck has createdAt",
      typeof record.createdAt === "string",
    );
  }
  // 7. Validate sorting by checkedAt descending by default.
  for (let i = 1; i < healthCheckPage.data.length; i++) {
    const prev = healthCheckPage.data[i - 1].checkedAt;
    const current = healthCheckPage.data[i].checkedAt;
    // checkedAt descending: previous date >= current date
    TestValidator.predicate(
      `healthCheck sorted desc checkedAt index ${i}`,
      prev >= current,
    );
  }
  // 8. Test unauthorized access: new base connection without token.
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    const baseConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.superAdministrator.healthChecks.index(
      baseConnection,
      { body: requestBody },
    );
  });
}
