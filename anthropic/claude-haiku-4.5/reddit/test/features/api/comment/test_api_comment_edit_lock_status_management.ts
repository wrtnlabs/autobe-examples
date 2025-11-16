import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validates comment lock status management for moderation workflows.
 *
 * Tests that comments can be locked to prevent replies and unlocked to allow
 * them again. This is essential for moderating comment threads and maintaining
 * discussion quality.
 *
 * Test workflow:
 *
 * 1. Administrator creates a category
 * 2. Member creates a community
 * 3. Member creates a post
 * 4. Member creates a comment
 * 5. Member locks the comment by setting is_locked to true
 * 6. Verify the comment is locked
 * 7. Member unlocks the comment by setting is_locked to false
 * 8. Verify the comment is unlocked
 */
export async function test_api_comment_edit_lock_status_management(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member authenticates and creates a community
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
        username: RandomGenerator.alphabets(10),
        password: "Test1234!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `test_${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Member creates a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Member creates a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  TestValidator.predicate(
    "comment should initially not be locked",
    comment.is_locked === false,
  );

  // Step 5: Member locks the comment by setting is_locked to true
  const lockedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {
        is_locked: true,
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(lockedComment);

  // Step 6: Verify the comment is locked
  TestValidator.equals(
    "locked comment should have is_locked true",
    lockedComment.is_locked,
    true,
  );

  // Step 7: Member unlocks the comment by setting is_locked to false
  const unlockedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: comment.id,
      body: {
        is_locked: false,
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(unlockedComment);

  // Step 8: Verify the comment is unlocked
  TestValidator.equals(
    "unlocked comment should have is_locked false",
    unlockedComment.is_locked,
    false,
  );
}
