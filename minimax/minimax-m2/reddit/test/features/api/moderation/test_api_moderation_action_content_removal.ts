import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_moderation_action_content_removal(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;

  const administrator = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "AdminTest123!",
        administrator_level: "moderator_admin",
        system_permissions: JSON.stringify({
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_view_hidden_content: true,
          },
          user_management: {
            can_view_user_data: true,
          },
          community_oversight: {
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create test post data for removal
  const testPost = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reddit_registereduser_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Inappropriate Content for Testing Removal",
    content_type: "text" as const,
    status: "active" as const,
    score: -10,
    comment_count: 5,
    view_count: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: typia.random<string & tags.Format<"uuid">>(),
      username: "problematic_user",
      display_name: "Problem User",
      avatar_url: undefined,
      karma_score: 50,
      account_status: "active",
      email_verified: true,
      account_created: new Date().toISOString(),
    },
    community: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "test_community",
      title: "Test Community",
      description: "A test community for moderation testing",
      type: "public" as const,
      status: "active" as const,
      business_status: "active" as const,
      member_count: 1000,
      post_count: 5000,
      subscriber_count: 950,
      nsfw_content_allowed: false,
      created_at: new Date().toISOString(),
    },
  };

  // Step 3: Create user reference for the content author
  const contentAuthor = {
    id: testPost.author.id,
    username: testPost.author.username,
    display_name: testPost.author.display_name,
    avatar_url: testPost.author.avatar_url,
    karma_score: testPost.author.karma_score,
    account_status: testPost.author.account_status,
    email_verified: testPost.author.email_verified,
    account_created: testPost.author.account_created,
  };

  // Step 4: Create content removal moderation action
  const moderationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          content: testPost,
          user: contentAuthor,
          action_type: "content_removal",
          reason:
            "Content violates community guidelines regarding hate speech and harassment. Post contains inappropriate language targeting specific groups.",
          duration_hours: undefined, // Permanent removal
          moderator_session_id: administrator.id,
          is_automated: false,
          status: "active",
          admin_notes:
            "Manual review completed. Content contains multiple policy violations. User history shows previous warnings.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 5: Validate moderation action properties
  // UUID format validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "moderation action has valid UUID format",
    uuidRegex.test(moderationAction.id),
  );

  TestValidator.equals(
    "action type is content_removal",
    moderationAction.action_type,
    "content_removal",
  );

  TestValidator.equals(
    "reason documents policy violation",
    moderationAction.reason,
    "Content violates community guidelines regarding hate speech and harassment. Post contains inappropriate language targeting specific groups.",
  );

  TestValidator.equals(
    "duration is null for permanent removal",
    moderationAction.duration_hours,
    null,
  );

  TestValidator.predicate(
    "is_automated is false for manual action",
    moderationAction.is_automated === false,
  );

  TestValidator.equals("status is active", moderationAction.status, "active");

  TestValidator.equals(
    "admin notes are preserved",
    moderationAction.admin_notes,
    "Manual review completed. Content contains multiple policy violations. User history shows previous warnings.",
  );

  TestValidator.equals(
    "appeal count is initialized to 0",
    moderationAction.appeal_count,
    0,
  );

  TestValidator.equals(
    "content reference is maintained",
    moderationAction.content_id,
    testPost.id,
  );

  TestValidator.equals(
    "user reference is maintained",
    moderationAction.user_id,
    contentAuthor.id,
  );

  TestValidator.equals(
    "moderator session is recorded",
    moderationAction.moderator_session_id,
    administrator.id,
  );

  TestValidator.predicate(
    "deleted_at is null for active action",
    moderationAction.deleted_at === null,
  );

  // Validate timestamp format and reasonableness
  const createdAt = new Date(moderationAction.created_at);
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    !isNaN(createdAt.getTime()),
  );

  TestValidator.predicate(
    "created_at is recent (within last hour)",
    createdAt.getTime() > Date.now() - 3600000,
  );

  TestValidator.predicate(
    "updated_at matches created_at initially",
    moderationAction.updated_at === moderationAction.created_at,
  );
}
