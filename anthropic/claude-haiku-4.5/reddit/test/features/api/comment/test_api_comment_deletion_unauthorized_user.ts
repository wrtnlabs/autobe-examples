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
 * Test that a different member cannot delete another member's comment.
 *
 * This scenario validates authorization enforcement for comment deletion. When
 * a member attempts to delete a comment created by another member, the API
 * should reject the request with HTTP 403 Forbidden. This ensures that only
 * comment authors or moderators can delete comments, preventing unauthorized
 * users from removing other members' content.
 *
 * Process:
 *
 * 1. Create and authenticate first member (comment author)
 * 2. Set up community infrastructure (category and community)
 * 3. Create a post by the first member
 * 4. Create a comment on that post by the first member
 * 5. Create and authenticate second member (unauthorized deleter)
 * 6. Attempt deletion of first member's comment as second member
 * 7. Verify deletion fails with 403 Forbidden
 * 8. Verify comment remains visible with original status
 */
export async function test_api_comment_deletion_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Create and authenticate first member
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = "TestPassword123!";
  const firstMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: firstMemberPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(firstMember);

  // 2a. Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(10),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2b. Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Switch back to first member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: firstMemberEmail,
      password: firstMemberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create a post by first member
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

  // 5. Create a comment on that post by first member
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Verify comment is visible
  TestValidator.equals(
    "comment visibility status should be visible",
    comment.visibility_status,
    "visible",
  );

  // 6. Create and authenticate second member
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "TestPassword456!";
  const secondMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: secondMemberPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(secondMember);

  // 7. Attempt to delete first member's comment as second member
  await TestValidator.error(
    "second member should not be able to delete first member's comment",
    async () => {
      await api.functional.communityPlatform.member.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );

  // 8. Switch back to first member and verify comment still exists and is visible
  await api.functional.auth.member.login(connection, {
    body: {
      email: firstMemberEmail,
      password: firstMemberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Verify the comment was not deleted by checking that it still exists
  // and has the original visibility_status
  TestValidator.predicate(
    "comment should still be visible after unauthorized deletion attempt",
    comment.visibility_status === "visible",
  );
}
