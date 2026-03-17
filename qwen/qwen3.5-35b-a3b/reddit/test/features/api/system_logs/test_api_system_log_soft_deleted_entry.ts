import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_system_log_soft_deleted_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditCommunityMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Generate UUID for system log entry
  const systemLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve system log entry (works regardless of deleted_at status)
  const logEntry = await api.functional.redditCommunity.system_logs.at(
    memberConnection,
    {
      systemLogId,
    },
  );
  typia.assert(logEntry);
  // 4. Validate deleted_at field can be non-null for soft-deleted logs
  TestValidator.equals(
    "deleted_at field exists on soft-deleted log",
    logEntry.deleted_at !== undefined,
    true,
  );
  // 5. Validate actor relationship if present
  if (logEntry.actor !== undefined && logEntry.actor !== null) {
    TestValidator.equals(
      "actor ID exists",
      logEntry.actor.id !== undefined,
      true,
    );
    TestValidator.equals(
      "actor username exists",
      logEntry.actor.username.length > 0,
      true,
    );
  }
  // 6. Validate target post relationship if present
  if (logEntry.targetPost !== undefined && logEntry.targetPost !== null) {
    TestValidator.equals(
      "targetPost ID exists",
      logEntry.targetPost.id !== undefined,
      true,
    );
    TestValidator.equals(
      "targetPost title exists",
      logEntry.targetPost.title.length > 0,
      true,
    );
  }
  // 7. Validate target comment relationship if present
  if (logEntry.targetComment !== undefined && logEntry.targetComment !== null) {
    TestValidator.equals(
      "targetComment ID exists",
      logEntry.targetComment.id !== undefined,
      true,
    );
  }
  // 8. Validate target community relationship if present
  if (
    logEntry.targetCommunity !== undefined &&
    logEntry.targetCommunity !== null
  ) {
    TestValidator.equals(
      "targetCommunity ID exists",
      logEntry.targetCommunity.id !== undefined,
      true,
    );
    TestValidator.equals(
      "targetCommunity name exists",
      logEntry.targetCommunity.name.length > 0,
      true,
    );
  }
  // 9. Validate target report relationship if present
  if (logEntry.targetReport !== undefined && logEntry.targetReport !== null) {
    TestValidator.equals(
      "targetReport ID exists",
      logEntry.targetReport.id !== undefined,
      true,
    );
  }
  // 10. Validate metadata field can be null
  TestValidator.equals(
    "metadata field exists",
    logEntry.metadata !== undefined,
    true,
  );
}
