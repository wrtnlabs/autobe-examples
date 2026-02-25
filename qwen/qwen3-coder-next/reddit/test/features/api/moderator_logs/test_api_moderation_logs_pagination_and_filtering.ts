import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_logs_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account for testing
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditClone.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(moderator);
  // 2. Get moderation logs with pagination
  const logsResponse = await api.functional.redditClone.moderators.logs.index(
    moderatorConnection,
    {
      moderatorId: moderator.id,
    },
  );
  typia.assert(logsResponse);
  // 3. Validate pagination structure
  TestValidator.equals(
    "has pagination info",
    logsResponse.pagination.current,
    1,
  );
  TestValidator.predicate("has records", logsResponse.pagination.records >= 0);
  TestValidator.predicate("has data array", Array.isArray(logsResponse.data));
  TestValidator.equals(
    "data length matches pagination",
    logsResponse.data.length,
    logsResponse.pagination.records,
  );
  // 4. Validate moderation log structure if records exist
  if (logsResponse.data.length > 0) {
    const firstLog = logsResponse.data[0];
    TestValidator.equals("has id", typeof firstLog.id, "string");
    TestValidator.equals("has moderator", typeof firstLog.moderator, "object");
    TestValidator.equals(
      "has target",
      firstLog.target === null || typeof firstLog.target === "object",
      true,
    );
    TestValidator.equals(
      "has targetType",
      ["post", "comment"].includes(firstLog.targetType),
      true,
    );
    TestValidator.equals(
      "has actionType",
      [
        "delete_post",
        "delete_comment",
        "ban_user",
        "unban_user",
        "approve_report",
        "dismiss_report",
      ].includes(firstLog.actionType),
      true,
    );
    TestValidator.predicate(
      "has createdAt",
      typeof firstLog.createdAt === "string",
    );
  }
}
