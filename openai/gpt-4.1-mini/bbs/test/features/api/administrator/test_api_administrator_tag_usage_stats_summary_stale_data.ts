import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_tag_usage_stats_summary_stale_data(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that the administrator can access the tag usage statistics summary
  // even when the data is stale, indicated by an old 'refreshed_at' timestamp.
  // 1. Admin join and get authorized
  const adminConnection: api.IConnection = { host: connection.host };
  // Because IDiscussionBoardAdministrator.IJoin has no required properties, empty body is fine
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Update adminConnection with Authorization header internally by utility function
  // 2. Call the tag usage stats summary, which should succeed even with stale data
  const stats =
    await api.functional.discussionBoard.administrator.tags.usage_stats.summary.index(
      adminConnection,
    );
  typia.assert(stats);
  // 3. Check the refreshed_at field to ensure it exists and is a past timestamp
  // Since the schema of IDiscussionBoardMvTagUsageStat is empty, we cannot check fields explicitly,
  // but we assume it includes a refreshed_at of type string ISO date as per specification.
  // So just check it is string and parseable date and is older than now.
  // Defensive type cast since IDiscussionBoardMvTagUsageStat has no properties in given schema
  const refreshedAtCandidate = (stats as any)?.refreshed_at;
  if (typeof refreshedAtCandidate !== "string") {
    throw new Error(
      "Missing or invalid refreshed_at timestamp in tag usage stats summary",
    );
  }
  const refreshedAtDate = new Date(refreshedAtCandidate);
  if (Number.isNaN(refreshedAtDate.getTime())) {
    throw new Error("refreshed_at timestamp is not a valid date string");
  }
  // Check that the refreshedAtDate is stale (older than now minus some threshold, e.g. 1 hour)
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  TestValidator.predicate(
    "tag usage stats refreshed_at is stale",
    refreshedAtDate.getTime() <= now.getTime() - oneHour,
  );
}
