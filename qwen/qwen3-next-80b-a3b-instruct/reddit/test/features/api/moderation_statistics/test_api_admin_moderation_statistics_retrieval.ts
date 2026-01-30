import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsModerationStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerationStatistics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsModerationStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsModerationStatistics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_moderation_statistics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Call the moderation statistics endpoint using admin connection
  const moderationStats: IPageICommunityBbsModerationStatistics =
    await api.functional.communityBbs.admin.statistics.moderation.index(
      adminConnection,
    );
  // Step 3: Validate the response structure
  typia.assert(moderationStats);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    moderationStats.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    moderationStats.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    moderationStats.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    moderationStats.pagination.pages >= 1,
  );
  // Step 5: Validate moderation statistics object
  const stats = moderationStats.data[0];
  TestValidator.predicate(
    "totalReports is at least 0",
    stats.totalReports >= 0,
  );
  TestValidator.predicate(
    "flaggedContent is at least 0",
    stats.flaggedContent >= 0,
  );
  TestValidator.predicate(
    "moderatorActions is at least 0",
    stats.moderatorActions >= 0,
  );
  TestValidator.predicate(
    "penaltiesApplied is at least 0",
    stats.penaltiesApplied >= 0,
  );
  TestValidator.predicate(
    "suspensionsIssued is at least 0",
    stats.suspensionsIssued >= 0,
  );
  TestValidator.predicate("userBans is at least 0", stats.userBans >= 0);
  // Step 6: Validate all statistics values are integer types within valid range
  TestValidator.predicate(
    "totalReports is int32",
    typeof stats.totalReports === "number" &&
      Number.isInteger(stats.totalReports),
  );
  TestValidator.predicate(
    "flaggedContent is int32",
    typeof stats.flaggedContent === "number" &&
      Number.isInteger(stats.flaggedContent),
  );
  TestValidator.predicate(
    "moderatorActions is int32",
    typeof stats.moderatorActions === "number" &&
      Number.isInteger(stats.moderatorActions),
  );
  TestValidator.predicate(
    "penaltiesApplied is int32",
    typeof stats.penaltiesApplied === "number" &&
      Number.isInteger(stats.penaltiesApplied),
  );
  TestValidator.predicate(
    "suspensionsIssued is int32",
    typeof stats.suspensionsIssued === "number" &&
      Number.isInteger(stats.suspensionsIssued),
  );
  TestValidator.predicate(
    "userBans is int32",
    typeof stats.userBans === "number" && Number.isInteger(stats.userBans),
  );
}
