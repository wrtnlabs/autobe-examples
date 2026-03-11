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

export async function test_api_moderation_audit_logs_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator (first member) - will be community owner
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(moderatorAuth);
  // 2. Create second member - will be added as moderator
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(secondMemberAuth);
  // 3. Create third member - will be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(bannedUserAuth);
  // 4. Create community with first member as owner
  const moderatorConnectionForCommunity: api.IConnection = {
    host: connection.host,
  };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnectionForCommunity,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10)
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, ""),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 5. Add second member as moderator (generates appoint_moderator audit log)
  const moderatorConnectionForModerators: api.IConnection = {
    host: connection.host,
  };
  const secondModerator =
    await api.functional.redditPlatform.member.communities.moderators.create(
      moderatorConnectionForModerators,
      {
        communityId: community.id,
        body: {
          user_id: secondMemberAuth.user.id,
        },
      },
    );
  typia.assert(secondModerator);
  // 6. Ban third member (generates ban_user audit log)
  const moderatorConnectionForBans: api.IConnection = { host: connection.host };
  const ban = await api.functional.redditPlatform.member.communities.bans.ban(
    moderatorConnectionForBans,
    {
      communityId: community.id,
      userId: bannedUserAuth.user.id,
      body: {
        userId: bannedUserAuth.user.id,
        expiresAt: null, // permanent ban
      },
    },
  );
  typia.assert(ban);
  // 7. Retrieve audit logs
  const moderatorConnectionForLogs: api.IConnection = { host: connection.host };
  const auditLogsResponse =
    await api.functional.redditPlatform.member.communities.moderation_audit_logs.index(
      moderatorConnectionForLogs,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(auditLogsResponse);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    auditLogsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    auditLogsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 2",
    () => auditLogsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    () => auditLogsResponse.pagination.pages >= 1,
  );
  // 9. Validate logs count
  TestValidator.equals(
    "audit log entries count",
    auditLogsResponse.data.length,
    2,
  );
  // 10. Validate sort order (newest first - DESC by created_at)
  if (auditLogsResponse.data.length > 1) {
    TestValidator.predicate(
      "logs sorted by created_at DESC",
      () =>
        auditLogsResponse.data[0].created_at >=
        auditLogsResponse.data[1].created_at,
    );
  }
  // 11. Validate required fields in each log entry
  for (const log of auditLogsResponse.data) {
    // Validate basic fields exist and are not null
    TestValidator.predicate(
      "log id exists",
      () => log.id !== null && log.id !== undefined,
    );
    TestValidator.predicate(
      "log action_type exists",
      () => log.action_type !== null && log.action_type !== undefined,
    );
    TestValidator.predicate(
      "log action_target_type exists",
      () =>
        log.action_target_type !== null && log.action_target_type !== undefined,
    );
    TestValidator.predicate(
      "log created_at exists",
      () => log.created_at !== null && log.created_at !== undefined,
    );
    // Validate moderator field
    TestValidator.predicate(
      "moderator exists",
      () => log.moderator !== null && log.moderator !== undefined,
    );
    TestValidator.predicate(
      "moderator id exists",
      () => log.moderator.id !== null && log.moderator.id !== undefined,
    );
    TestValidator.predicate(
      "moderator username exists",
      () =>
        log.moderator.username !== null && log.moderator.username !== undefined,
    );
    // Validate community field
    TestValidator.predicate(
      "community exists",
      () => log.community !== null && log.community !== undefined,
    );
    TestValidator.predicate(
      "community id exists",
      () => log.community.id !== null && log.community.id !== undefined,
    );
    TestValidator.predicate(
      "community name exists",
      () => log.community.name !== null && log.community.name !== undefined,
    );
  }
  // 12. Validate specific action types present
  const actionTypes = auditLogsResponse.data.map((log) => log.action_type);
  TestValidator.predicate("contains ban_user action", () =>
    actionTypes.includes("ban_user"),
  );
  TestValidator.predicate("contains appoint_moderator action", () =>
    actionTypes.includes("appoint_moderator"),
  );
  // 13. Validate polymorphic target references for ban_user
  const banUserLog = auditLogsResponse.data.find(
    (log) => log.action_type === "ban_user",
  );
  TestValidator.predicate(
    "ban_user has target user id",
    () =>
      banUserLog?.action_target_user_id !== null &&
      banUserLog?.action_target_user_id !== undefined,
  );
  TestValidator.equals(
    "ban_user has correct target type",
    banUserLog?.action_target_type,
    "user",
  );
  TestValidator.equals(
    "ban_user target user id matches banned user",
    banUserLog?.action_target_user_id,
    bannedUserAuth.user.id,
  );
  // 14. Validate polymorphic target references for appoint_moderator
  const appointModeratorLog = auditLogsResponse.data.find(
    (log) => log.action_type === "appoint_moderator",
  );
  TestValidator.predicate(
    "appoint_moderator has target user id",
    () =>
      appointModeratorLog?.action_target_user_id !== null &&
      appointModeratorLog?.action_target_user_id !== undefined,
  );
  TestValidator.equals(
    "appoint_moderator has correct target type",
    appointModeratorLog?.action_target_type,
    "user",
  );
  TestValidator.equals(
    "appoint_moderator target user id matches second moderator",
    appointModeratorLog?.action_target_user_id,
    secondMemberAuth.user.id,
  );
}
