import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_bans_create } from "../../../generate/generate_random_community_platform_moderator_communities_bans_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_admin_moderation_audit_logs_filter_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user);
  // Create community owned by the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // Create ban action by moderator to generate audit log
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: user.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(admin);
  // Search moderation audit logs filtered by moderator_id
  const searchRequest = {
    moderator_id: moderator.id,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;
  const auditLogs =
    await api.functional.communityPlatform.admin.moderation_audit_logs.index(
      adminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(auditLogs);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    auditLogs.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", auditLogs.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    auditLogs.pagination.pages >= 0,
  );
  // Validate audit log entries
  if (auditLogs.data.length > 0) {
    auditLogs.data.forEach((log) => {
      TestValidator.equals(
        "moderator ID matches filter",
        log.moderator.id,
        moderator.id,
      );
      TestValidator.predicate("has action type", log.action_type.length > 0);
      TestValidator.predicate(
        "has action details",
        log.action_details.length > 0,
      );
      TestValidator.predicate(
        "has creation timestamp",
        log.created_at.length > 0,
      );
    });
  }
  // Test pagination with different parameters
  const searchRequestPage2 = {
    moderator_id: moderator.id,
    page: 2,
    limit: 5,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;
  const auditLogsPage2 =
    await api.functional.communityPlatform.admin.moderation_audit_logs.index(
      adminConnection,
      {
        body: searchRequestPage2,
      },
    );
  typia.assert(auditLogsPage2);
  TestValidator.equals(
    "page 2 current page",
    auditLogsPage2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", auditLogsPage2.pagination.limit, 5);
}
