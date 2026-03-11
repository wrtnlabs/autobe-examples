import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
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
import { generate_random_reddit_platform_admin_communities_bans_create } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_create";
import { generate_random_reddit_platform_admin_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_admin_communities_moderators_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_admin_audit_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(16),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Member authentication (ban target)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Admin login (re-authenticate for clean session)
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 4. Admin creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection2,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Admin bans member user (generates USER_BAN audit log)
  const banResponse =
    await api.functional.redditPlatform.admin.communities.bans.create(
      adminConnection2,
      {
        communityId: community.id,
        body: {
          userId: memberAuth.id,
          expiresAt: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banResponse);
  // 6. Admin adds moderator (generates MODERATOR_ADD audit log)
  const modConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_member_join(modConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(modAuth);
  await api.functional.redditPlatform.admin.communities.moderators.create(
    adminConnection2,
    {
      communityId: community.id,
      body: {
        user_id: modAuth.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 7. Retrieve and validate audit log
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const auditLog = await api.functional.redditPlatform.admin.audit_logs.getById(
    adminConnection2,
    {
      id: auditLogId,
    },
  );
  typia.assert(auditLog);
  // Validate audit log has admin reference
  typia.assert(auditLog.admin);
  TestValidator.equals(
    "admin ID is UUID",
    true,
    typia.is<string & tags.Format<"uuid">>(auditLog.admin.id),
  );
  TestValidator.equals(
    "admin has username",
    auditLog.admin.username.length > 0,
    true,
  );
  TestValidator.equals(
    "admin has display name",
    auditLog.admin.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "admin has email",
    typia.is<string & tags.Format<"email">>(auditLog.admin.email),
    true,
  );
  TestValidator.equals(
    "admin has is active",
    typeof auditLog.admin.is_active === "boolean",
    true,
  );
  TestValidator.equals(
    "admin has created at",
    typia.is<string & tags.Format<"date-time">>(auditLog.admin.created_at),
    true,
  );
  // Validate session reference (optional)
  if (auditLog.session !== null && auditLog.session !== undefined) {
    typia.assert(auditLog.session);
    TestValidator.equals(
      "session ID is UUID",
      true,
      typia.is<string & tags.Format<"uuid">>(auditLog.session.id),
    );
    TestValidator.equals(
      "session has admin reference",
      auditLog.session.admin !== undefined,
      true,
    );
    TestValidator.equals(
      "session has IP",
      auditLog.session.ip.length > 0,
      true,
    );
    TestValidator.equals(
      "session has created at",
      typia.is<string & tags.Format<"date-time">>(auditLog.session.createdAt),
      true,
    );
    TestValidator.equals(
      "session has expired at",
      typia.is<string & tags.Format<"date-time">>(auditLog.session.expiredAt),
      true,
    );
    typia.assert(auditLog.session.admin);
    TestValidator.equals(
      "session admin has ID",
      auditLog.session.admin.id.length > 0,
      true,
    );
    TestValidator.equals(
      "session admin has username",
      auditLog.session.admin.username.length > 0,
      true,
    );
    TestValidator.equals(
      "session admin has display name",
      auditLog.session.admin.display_name.length > 0,
      true,
    );
  }
  // Validate action details (optional)
  if (
    auditLog.actionDetails !== null &&
    auditLog.actionDetails !== undefined
  ) {
    typia.assert(auditLog.actionDetails);
    const parsed: unknown = JSON.parse(auditLog.actionDetails);
    typia.assertGuard(parsed);
    TestValidator.equals(
      "action details is valid JSON object",
      typeof parsed === "object" && parsed !== null,
      true,
    );
  }
  // Validate timestamps
  TestValidator.equals(
    "action type is string",
    auditLog.actionType.length > 0,
    true,
  );
  TestValidator.equals(
    "action status is string",
    auditLog.actionStatus.length > 0,
    true,
  );
  TestValidator.equals(
    "target entity type is optional string",
    auditLog.targetEntityType === undefined ||
      typeof auditLog.targetEntityType === "string",
    true,
  );
  TestValidator.equals(
    "target entity ID is optional UUID",
    auditLog.targetEntityId === undefined ||
      typia.is<string & tags.Format<"uuid">>(auditLog.targetEntityId),
    true,
  );
  TestValidator.equals(
    "IP address is optional string",
    auditLog.ipAddress === undefined || typeof auditLog.ipAddress === "string",
    true,
  );
  TestValidator.equals(
    "user agent is optional string",
    auditLog.userAgent === undefined || typeof auditLog.userAgent === "string",
    true,
  );
  TestValidator.equals(
    "referrer is optional string",
    auditLog.referrer === undefined || typeof auditLog.referrer === "string",
    true,
  );
  TestValidator.equals(
    "created at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(auditLog.createdAt),
    true,
  );
  const createdDate = new Date(auditLog.createdAt);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDate.getTime()),
  );
}