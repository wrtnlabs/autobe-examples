import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_log_index_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, { body: {} });
  // Prepare the admin connection with Authorization header
  adminConnection.headers = { Authorization: admin.token.access };
  // Call the activity log index endpoint without any filters to get default pagination
  const output =
    await api.functional.communityPlatform.admin.activityLogs.index(
      adminConnection,
      {
        body: {}, // No filters for default pagination
      },
    );
  // Assert the output matches the expected structure
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // Validate each activity log entry's properties and types
  output.data.forEach((log, index) => {
    typia.assert(log);
    // Validate required properties
    TestValidator.predicate(
      `log[${index}] has valid UUID id`,
      typeof log.id === "string" && log.id.length === 36,
    );
    // Validate user property (either ICommunityPlatformUser.ISummary or null)
    if (log.user !== null) {
      typia.assert(log.user);
      TestValidator.predicate(
        `log[${index}] user id is valid UUID`,
        typeof log.user.id === "string" && log.user.id.length === 36,
      );
    }
    // Validate actionType is non-empty string
    TestValidator.predicate(
      `log[${index}] has non-empty actionType`,
      typeof log.actionType === "string" && log.actionType.length > 0,
    );
    // Validate ipAddress userAgent and metadata have string or null
    TestValidator.predicate(
      `log[${index}] ipAddress is string or null`,
      log.ipAddress === null || typeof log.ipAddress === "string",
    );
    TestValidator.predicate(
      `log[${index}] userAgent is string or null`,
      log.userAgent === null || typeof log.userAgent === "string",
    );
    TestValidator.predicate(
      `log[${index}] metadata is string or null`,
      log.metadata === null || typeof log.metadata === "string",
    );
    // Validate createdAt is ISO date-time string
    TestValidator.predicate(
      `log[${index}] createdAt is non-empty string`,
      typeof log.createdAt === "string" && log.createdAt.length > 0,
    );
  });
}
