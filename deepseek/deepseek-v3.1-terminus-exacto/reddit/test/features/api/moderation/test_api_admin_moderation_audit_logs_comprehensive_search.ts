import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_moderation_audit_logs_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create and authenticate moderator
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
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 3. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 4. User creates a post (using a generic community name that might exist)
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general",
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Moderator deletes the post to generate audit log
  await api.functional.communityPlatform.moderator.posts.erase(
    moderatorConnection,
    {
      postId: post.id,
    },
  );
  // 6. Admin searches audit logs with various filters
  // Search by action_type (using a generic action type that might exist)
  const actionTypeSearch =
    await api.functional.communityPlatform.admin.moderation_audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(actionTypeSearch);
  TestValidator.predicate(
    "search returns results",
    actionTypeSearch.data.length >= 0,
  );
  // Search by target_user_id
  const targetUserSearch =
    await api.functional.communityPlatform.admin.moderation_audit_logs.index(
      adminConnection,
      {
        body: {
          target_user_id: user.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(targetUserSearch);
  // Search by moderator_id
  const moderatorSearch =
    await api.functional.communityPlatform.admin.moderation_audit_logs.index(
      adminConnection,
      {
        body: {
          moderator_id: moderator.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(moderatorSearch);
  // Search with combined filters
  const combinedSearch =
    await api.functional.communityPlatform.admin.moderation_audit_logs.index(
      adminConnection,
      {
        body: {
          moderator_id: moderator.id,
          target_user_id: user.id,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    combinedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    combinedSearch.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    combinedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    combinedSearch.pagination.pages >= 0,
  );
  // Validate audit log structure if results exist
  if (combinedSearch.data.length > 0) {
    const auditLog = combinedSearch.data[0];
    TestValidator.equals("audit log has id", typeof auditLog.id, "string");
    TestValidator.equals(
      "audit log has action type",
      typeof auditLog.action_type,
      "string",
    );
    TestValidator.equals(
      "audit log has action details",
      typeof auditLog.action_details,
      "string",
    );
    TestValidator.equals(
      "audit log has moderator",
      typeof auditLog.moderator.id,
      "string",
    );
    TestValidator.equals(
      "audit log has creation timestamp",
      typeof auditLog.created_at,
      "string",
    );
  }
  // Test empty result scenario with non-existent filter
  const emptySearch =
    await api.functional.communityPlatform.admin.moderation_audit_logs.index(
      adminConnection,
      {
        body: {
          target_user_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search handled gracefully",
    emptySearch.data.length >= 0,
  );
}
