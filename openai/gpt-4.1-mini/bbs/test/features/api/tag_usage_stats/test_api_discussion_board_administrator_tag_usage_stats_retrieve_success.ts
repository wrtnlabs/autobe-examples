import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_discussion_board_administrator_tag_usage_stats_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePa$$word123",
    },
  });
  typia.assert(admin);
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Generate a valid tag usage stats id by calling the API via random id (simulate)
  const validUsageStat =
    await api.functional.discussionBoard.administrator.tag_usage_stats.at(
      adminConnection,
      {
        usageStatId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(validUsageStat);
  // 3. Retrieve tag usage stat by the valid id
  const retrievedStat =
    await api.functional.discussionBoard.administrator.tag_usage_stats.at(
      adminConnection,
      {
        usageStatId: validUsageStat.id,
      },
    );
  typia.assert(retrievedStat);
  TestValidator.equals(
    "tag usage stat id",
    retrievedStat.id,
    validUsageStat.id,
  );
  TestValidator.equals(
    "discussion board tag id",
    retrievedStat.discussionBoardTagId,
    validUsageStat.discussionBoardTagId,
  );
  TestValidator.predicate(
    "article count non-negative",
    retrievedStat.articleCount >= 0,
  );
  TestValidator.predicate(
    "comment count non-negative",
    retrievedStat.commentCount >= 0,
  );
  TestValidator.predicate(
    "refreshedAt is ISO string",
    typeof retrievedStat.refreshedAt === "string",
  );
  // 4. Test error case: non-existent usageStatId
  await TestValidator.httpError(
    "non-existent usageStatId should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.tag_usage_stats.at(
        adminConnection,
        {
          usageStatId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
