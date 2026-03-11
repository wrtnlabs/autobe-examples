import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAuditLog";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_member_communities_bans_ban";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_moderation_audit_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator user
  const moderatorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // Create moderator connection with token
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create community owned by moderator
  const community =
    await api.functional.redditPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create another user to ban
  const bannedUserAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(bannedUserAuth);
  // 4. Perform ban action as moderator
  await api.functional.redditPlatform.member.communities.bans.ban(
    moderatorConnection,
    {
      communityId: community.id,
      userId: bannedUserAuth.user.id,
      body: {
        userId: bannedUserAuth.user.id,
      } satisfies DeepPartial<IRedditPlatformCommunityBan.ICreate>,
    },
  );
  // 5. Query audit logs with actionType='ban_user' filter
  const auditLogs =
    await api.functional.redditPlatform.member.communities.moderation_audit_logs.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          actionType: "ban_user",
          page: 1,
          limit: 50,
        } satisfies IRedditPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogs);
  // 6. Validate filtering results
  TestValidator.equals(
    "only ban_user entries returned",
    auditLogs.data.every((log) => log.action_type === "ban_user"),
    true,
  );
  TestValidator.equals(
    "ban_user count matches total",
    auditLogs.pagination.records,
    auditLogs.data.length,
  );
  // Validate each entry has correct target type and moderator info
  for (const log of auditLogs.data) {
    typia.assert(log);
    TestValidator.equals(
      `entry ${log.id} has ban_user action type`,
      log.action_type,
      "ban_user",
    );
    TestValidator.equals(
      `entry ${log.id} has user target type`,
      log.action_target_type,
      "user",
    );
    TestValidator.equals(
      `entry ${log.id} has valid target user ID`,
      log.action_target_user_id !== null &&
        log.action_target_user_id !== undefined,
      true,
    );
    typia.assert(log.moderator);
    typia.assert(log.community);
    TestValidator.equals(
      `entry ${log.id} has correct community`,
      log.community.id,
      community.id,
    );
    TestValidator.equals(
      `entry ${log.id} has correct moderator`,
      log.moderator.id,
      moderatorAuth.user.id,
    );
  }
}