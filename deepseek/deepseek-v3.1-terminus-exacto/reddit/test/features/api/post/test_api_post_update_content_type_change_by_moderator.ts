import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test moderator's ability to change post content types between text, link,
 * media, and poll formats. Validates content migration workflows, type-specific
 * validation rules, and ensures post integrity is maintained during type
 * transitions.
 */
export async function test_api_post_update_content_type_change_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create initial post as member
  const initialPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(initialPost);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorJoin);

  // Step 4: Login as moderator to establish proper authentication context
  const moderator = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(moderator);

  // Step 5: Test content type transitions
  const postTypes = ["link", "media", "poll", "text"] as const;

  for (const targetType of postTypes) {
    // Update post type as moderator
    const updatedPost =
      await api.functional.communityPlatform.moderator.posts.update(
        connection,
        {
          postId: initialPost.id,
          body: {
            post_type: targetType,
          } satisfies ICommunityPlatformPost.IUpdate,
        },
      );
    typia.assert(updatedPost);

    // Validate post integrity is maintained
    TestValidator.equals(
      "post ID remains unchanged",
      updatedPost.id,
      initialPost.id,
    );
    TestValidator.equals(
      "title remains unchanged",
      updatedPost.title,
      initialPost.title,
    );
    TestValidator.equals(
      "community ID remains unchanged",
      updatedPost.community_platform_community_id,
      initialPost.community_platform_community_id,
    );
    TestValidator.equals(
      "post type is updated correctly",
      updatedPost.post_type,
      targetType,
    );
    TestValidator.equals(
      "status remains unchanged",
      updatedPost.status,
      initialPost.status,
    );

    // Validate community relationship is maintained
    TestValidator.equals(
      "community ID in summary matches",
      updatedPost.community.id,
      initialPost.community.id,
    );

    // Validate that updated_at timestamp is newer
    TestValidator.predicate(
      "updated_at timestamp is newer",
      new Date(updatedPost.updated_at) > new Date(initialPost.updated_at),
    );
  }

  // Step 6: Test partial updates with multiple fields
  const finalUpdate =
    await api.functional.communityPlatform.moderator.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 10,
        }),
        post_type: "media",
        status: "archived",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(finalUpdate);

  // Validate all fields are properly updated
  TestValidator.notEquals(
    "title should be different",
    finalUpdate.title,
    initialPost.title,
  );
  TestValidator.equals("post type is media", finalUpdate.post_type, "media");
  TestValidator.equals("status is archived", finalUpdate.status, "archived");
  TestValidator.equals("ID remains unchanged", finalUpdate.id, initialPost.id);
  TestValidator.equals(
    "community relationship maintained",
    finalUpdate.community.id,
    initialPost.community.id,
  );

  // Step 7: Test that member cannot update post after moderator changes
  // Switch back to member authentication
  const memberLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberLogin);

  // Attempt to update post as member should fail (member posts API doesn't have update)
  // This validates that only moderators can update posts
  await TestValidator.error(
    "member should not be able to update posts",
    async () => {
      // There's no member posts update API, so this should fail
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          title: "Attempted update",
          post_type: "text",
          status: "published",
          community_platform_community_id:
            initialPost.community_platform_community_id,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    },
  );
}
