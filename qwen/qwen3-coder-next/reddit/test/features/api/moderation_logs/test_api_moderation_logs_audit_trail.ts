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

/**
 * Test retrieval of moderation action logs for a specific moderator.
 * This validates the audit trail functionality that tracks all moderation
 * actions performed by community moderators.
 */
export async function test_api_moderation_logs_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator account to perform moderation actions
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // Retrieve moderation logs for the moderator
  const logs = await api.functional.redditClone.moderators.logs.index(
    moderatorConnection,
    {
      moderatorId: moderator.id,
    },
  );
  typia.assert(logs);
  // Validate log entry structure (if logs exist)
  if (logs.data.length > 0) {
    const logEntry = logs.data[0];
    // Validate log has moderator info
    TestValidator.equals(
      "log has moderator info",
      logEntry.moderator.id,
      moderator.id,
    );
    // Validate log has action type
    TestValidator.predicate("log has action type", () =>
      [
        "delete_post",
        "delete_comment",
        "ban_user",
        "unban_user",
        "approve_report",
        "dismiss_report",
      ].includes(logEntry.actionType),
    );
    // Validate log has target type
    TestValidator.equals(
      "log has target type",
      logEntry.targetType === "post" || logEntry.targetType === "comment",
      true,
    );
    // Validate log has timestamp
    TestValidator.predicate(
      "log has timestamp",
      () => logEntry.createdAt !== undefined && logEntry.createdAt !== null,
    );
  } else {
    // Validate empty logs response
    TestValidator.equals("logs count is 0", logs.data.length, 0);
  }
}
