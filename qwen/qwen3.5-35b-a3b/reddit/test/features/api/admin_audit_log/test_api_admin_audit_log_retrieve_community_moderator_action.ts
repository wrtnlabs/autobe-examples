import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_admin_audit_log_retrieve_community_moderator_action(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.ILogin>(),
  });
  typia.assert(admin);
  // Step 2: Create first member (community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(member1);
  // Step 3: Create community with first member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: typia.random<
            string &
              tags.Pattern<"^[a-zA-Z0-9_]+$"> &
              tags.MinLength<3> &
              tags.MaxLength<21>
          >(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Create second member (future moderator)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(member2);
  // Step 5: Add second member as moderator (generates audit log)
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.create(
      member1Connection,
      {
        communityId: community.id,
        body: {
          user_id: member2.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // Step 6: Retrieve moderation audit logs to find the entry
  const moderationAuditLogs =
    await api.functional.redditPlatform.member.communities.moderation_audit_logs.index(
      member1Connection,
      {
        communityId: community.id,
        body: {
          actionType: "appoint_moderator",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(moderationAuditLogs);
  // Find the most recent moderator appointment
  const moderatorLog = moderationAuditLogs.data.find(
    (log) => log.action_type === "appoint_moderator",
  );
  TestValidator.notEquals(
    "moderation audit log should exist",
    moderatorLog,
    undefined,
  );
  if (moderatorLog) {
    // Step 7: Retrieve admin audit log using the same ID
    const adminAuditLog =
      await api.functional.redditPlatform.admin.audit_logs.getByLogid(
        adminConnection,
        {
          logId: moderatorLog.id,
        },
      );
    typia.assert(adminAuditLog);
    // Step 8: Validate the response
    TestValidator.equals(
      "target entity type is COMMUNITY_MODERATOR",
      adminAuditLog.targetEntityType,
      "COMMUNITY_MODERATOR",
    );
    TestValidator.equals(
      "target entity ID matches community",
      adminAuditLog.targetEntityId,
      community.id,
    );
    // Verify action details contains JSON-formatted information
    if (adminAuditLog.actionDetails) {
      const details = JSON.parse(adminAuditLog.actionDetails);
      TestValidator.predicate(
        "action details should contain community_id",
        details.community_id === community.id,
      );
      TestValidator.predicate(
        "action details should contain moderator user ID",
        details.user_id === member2.user.id,
      );
      TestValidator.predicate(
        "action details should contain timestamp",
        typeof details.created_at === "string",
      );
    }
    TestValidator.equals(
      "action type is correct",
      adminAuditLog.actionType,
      "COMMUNITY_MODERATOR",
    );
    TestValidator.equals(
      "action status is success",
      adminAuditLog.actionStatus,
      "SUCCESS",
    );
  }
}
