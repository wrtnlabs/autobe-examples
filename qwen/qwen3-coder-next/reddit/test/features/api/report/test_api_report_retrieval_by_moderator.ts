import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_report_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  typia.assert(moderator);
  // Test: Moderator retrieves reports with pagination
  const reports =
    await api.functional.redditPlatform.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditPlatformReport.IRequest>(),
      },
    );
  typia.assert(reports);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination",
    reports.pagination.current > 0,
  );
  TestValidator.predicate("has valid limit", reports.pagination.limit >= 0);
  TestValidator.predicate("has valid records", reports.pagination.records >= 0);
  TestValidator.predicate("has valid pages", reports.pagination.pages >= 0);
  // Validate reports data structure
  TestValidator.predicate(
    "has reports data array",
    Array.isArray(reports.data),
  );
  // Validate each report summary structure
  reports.data.forEach((report, index) => {
    TestValidator.predicate(
      `report ${index} is valid`,
      typeof report === "object",
    );
  });
}
