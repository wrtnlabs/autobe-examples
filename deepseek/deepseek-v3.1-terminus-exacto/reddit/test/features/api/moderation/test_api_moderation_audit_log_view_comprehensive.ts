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
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test comprehensive moderation audit log retrieval workflow.
 *
 * This test validates that an admin can retrieve a complete moderation audit log
 * record with all related entity details after a moderator performs a ban action.
 * The workflow involves:
 * 1. Admin setup and authentication
 * 2. Regular user creation for moderation target
 * 3. Moderator creation and authentication
 * 4. Community, post, and comment creation as moderation context
 * 5. Ban action by moderator to generate audit log
 * 6. Audit log retrieval and comprehensive validation
 */
export async function test_api_moderation_audit_log_view_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Audit Log Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Regular user creation (target for moderation)
  const userConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: RandomGenerator.alphabets(8),
      display_name: "Target User",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Moderator creation
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "mod1234",
      username: RandomGenerator.alphabets(8),
      display_name: "Community Moderator",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 4. Create community as the target user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Create post in the community
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create comment on the post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 7. Perform ban action by moderator
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: targetUser.id,
          reason: "Violation of community guidelines",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // 8. Retrieve the audit log as admin - using the ban ID which should correspond to the audit log ID
  // Based on the scenario, the ban creation should generate an audit log with the same ID
  const auditLog =
    await api.functional.communityPlatform.admin.moderation_audit_logs.at(
      adminConnection,
      {
        logId: ban.id,
      },
    );
  typia.assert(auditLog);
  // 9. Validate comprehensive audit log details
  TestValidator.equals("audit log ID matches ban ID", auditLog.id, ban.id);
  TestValidator.predicate(
    "has valid action type",
    auditLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "has action details",
    auditLog.action_details.length > 0,
  );
  TestValidator.predicate("has IP address", auditLog.ip_address.length > 0);
  TestValidator.predicate(
    "has valid timestamp",
    auditLog.created_at.length > 0,
  );
  // Validate moderator information
  TestValidator.equals(
    "moderator ID matches",
    auditLog.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator email matches",
    auditLog.moderator.email,
    moderator.email,
  );
  // Validate target user information
  TestValidator.equals(
    "target user ID matches",
    auditLog.targetUser?.id,
    targetUser.id,
  );
  TestValidator.equals(
    "target user username matches",
    auditLog.targetUser?.username,
    targetUser.username,
  );
  // Validate community context
  TestValidator.equals(
    "target community ID matches",
    auditLog.targetCommunity?.id,
    community.id,
  );
  TestValidator.equals(
    "target community name matches",
    auditLog.targetCommunity?.name,
    community.name,
  );
  // Validate ban record reference
  TestValidator.equals(
    "community ban ID matches",
    auditLog.communityBan?.id,
    ban.id,
  );
  TestValidator.equals(
    "community ban reason matches",
    auditLog.communityBan?.reason,
    ban.reason,
  );
  // Validate timestamp is recent (within last 5 minutes)
  const auditTime = new Date(auditLog.created_at);
  const now = new Date();
  const timeDiff = now.getTime() - auditTime.getTime();
  TestValidator.predicate(
    "audit log timestamp is recent",
    timeDiff < 5 * 60 * 1000,
  );
}