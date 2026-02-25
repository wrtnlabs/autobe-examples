import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_log_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Search moderation logs with basic parameters
  const searchResult: IPageIDiscussionBoardModeratedContentHistory.ISummary =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure - correct path to nested pagination
  TestValidator.equals(
    "pagination structure",
    Object.keys(searchResult.pagination.pagination),
    ["current", "limit", "records", "pages"],
  );
  // Validate pagination metadata with corrected path
  TestValidator.predicate(
    "current page is positive",
    searchResult.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    searchResult.pagination.pagination.limit >= 1 &&
      searchResult.pagination.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records is non-negative",
    searchResult.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    searchResult.pagination.pagination.pages >= 0,
  );
  // Validate data array structure
  if (searchResult.data.length > 0) {
    const sampleLog = searchResult.data[0];
    TestValidator.equals(
      "log entry has required properties",
      Object.keys(sampleLog),
      [
        "id",
        "action_type",
        "action_description",
        "performed_at",
        "status",
        "admin",
        "super_admin",
      ],
    );
    // Validate individual log entry fields
    TestValidator.predicate(
      "action_type is string",
      typeof sampleLog.action_type === "string",
    );
    TestValidator.predicate(
      "action_description is string",
      typeof sampleLog.action_description === "string",
    );
    TestValidator.predicate(
      "performed_at is valid datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleLog.performed_at),
    );
    TestValidator.predicate(
      "status is string",
      typeof sampleLog.status === "string",
    );
    // Validate administrator identity presence (at least one should be present)
    TestValidator.predicate(
      "has administrator identity",
      sampleLog.admin !== null || sampleLog.super_admin !== null,
    );
  }
}
