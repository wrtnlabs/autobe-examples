import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_owner_communities_bans_create_ban";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";

/**
 * Test moderation audit log filtering by action type.
 * This test validates that owners can filter audit logs to show only specific
 * moderation actions (delete_post, delete_comment, ban_user, unban_user,
 * approve_report, dismiss_report).
 */
export async function test_api_owner_audit_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner for authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
      } satisfies IRedditCloneOwner.IJoin,
    },
  );
  typia.assert(owner);
  // 2. Test filtering audit logs by action type
  const actionTypes = [
    "ban_user",
    "delete_post",
    "delete_comment",
    "approve_report",
    "dismiss_report",
    "unban_user",
  ] as const;
  for (const actionType of actionTypes) {
    const filteredLogs =
      await api.functional.redditClone.owner.audit_logs.index(ownerConnection, {
        body: {
          actionType: actionType,
          limit: 10,
          page: 1,
        } satisfies IRedditCloneModerationLog.IRequest,
      });
    typia.assert(filteredLogs);
    // Validate that only logs of the specified action type are returned
    if (filteredLogs.data.length > 0) {
      TestValidator.predicate(
        `all ${actionType} logs`,
        filteredLogs.data.every(
          (log: IRedditCloneModerationLog.ISummary) =>
            log.actionType === actionType,
        ),
      );
    }
  }
  // 3. Test combined filtering (action type + date range)
  const combinedFilterLogs =
    await api.functional.redditClone.owner.audit_logs.index(ownerConnection, {
      body: {
        actionType: "ban_user",
        startDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        endDate: new Date().toISOString(),
        limit: 10,
        page: 1,
      } satisfies IRedditCloneModerationLog.IRequest,
    });
  typia.assert(combinedFilterLogs);
}
