import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_logs_retrieve_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // The test validates retrieving moderation logs with default pagination and no filters
  // 1. Admin join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Retrieve moderation logs with empty filter to use default pagination
  const body: ICommunityPlatformModerationLog.IRequest = {};
  const logsPage =
    await api.functional.communityPlatform.admin.moderation_logs.index(
      adminConnection,
      { body },
    );
  typia.assert(logsPage);
  // 3. Assert pagination defaults
  TestValidator.predicate(
    "pagination current page at least 1",
    logsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    logsPage.pagination.limit >= 1 && logsPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    logsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    logsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent with records and limit",
    logsPage.pagination.pages ===
      Math.ceil(logsPage.pagination.records / logsPage.pagination.limit) ||
      logsPage.pagination.pages === 0,
  );
  // 4. Validate each moderation log entry
  for (const log of logsPage.data) {
    typia.assert(log);
    // Check essential fields existence
    TestValidator.predicate(
      "log has id",
      typeof log.id === "string" && log.id.length > 0,
    );
    TestValidator.predicate(
      "log actionType non-empty",
      typeof log.actionType === "string" && log.actionType.length > 0,
    );
    TestValidator.predicate(
      "log createdAt valid ISO",
      typeof log.createdAt === "string" && log.createdAt.length > 0,
    );
    TestValidator.predicate(
      "log updatedAt valid ISO",
      typeof log.updatedAt === "string" && log.updatedAt.length > 0,
    );
    // Moderator info presence
    TestValidator.predicate(
      "log has moderator",
      typeof log.moderator === "object" && log.moderator !== null,
    );
    // Moderator id exists
    if (log.moderator !== null && "id" in log.moderator) {
      TestValidator.predicate(
        "moderator id is non-empty string",
        typeof log.moderator.id === "string" && log.moderator.id.length > 0,
      );
    }
  }
}
