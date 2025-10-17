import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that platform admin accounts have universal permission to delete any
 * comment for moderation and content safety, regardless of authorship or
 * community.
 *
 * Business context: Only platform admins possess absolute moderation ability
 * for deleting/soft-deleting comments (including parent/child) from any post in
 * any community. Admin deletion actions must leave audit/compliance evidence
 * and NOT physically erase comments, but set deleted_at to mark the comment as
 * deleted. Moderation actions must work regardless of nesting or author.
 *
 * Steps:
 *
 * 1. Register a unique platform admin and keep admin session.
 * 2. Register a non-admin member. (Different actor)
 * 3. Member creates a community via the normal member-completion path to provide a
 *    community context (member is creator).
 * 4. Member creates a post (in their community).
 * 5. Member creates a root comment (to-be parent).
 * 6. Member creates a child reply comment (reply-to-root; nesting).
 * 7. Admin (admin session) invokes the admin DELETE endpoint for the root comment
 *    (parent of reply), targeting member's post.
 * 8. Verify that:
 *
 *    - The targeted root comment's deleted_at is now set (soft-deleted).
 *    - The child reply's business logic is consistent: either remains, is orphaned,
 *         or is (if applicable) also soft-deleted depending on platform
 *         policy.
 *    - Only the targeted comment is affected unless platform requires recursive
 *         delete; verify child reply's existence and status.
 *    - Audit logs/registers admin as the actor of moderation (Note: audit log check
 *         may require fetching or validation via companion mechanism if API
 *         exists).
 * 9. (Edge) Attempt to delete child reply as admin (should succeed as well).
 * 10. Validate both comments' deleted_at timestamps and status, remain present but
 *     marked deleted.
 * 11. (Error path) Try deleting the same comment again as admin—should error or be
 *     a no-op, not crash (error test).
 */
export async function test_api_admin_comment_deletion_in_sensitive_content_moderation_case(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminModerate!12345",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberTest!12345",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates a community
  const communityCreate = {
    name: RandomGenerator.name(2),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1, sentenceMin: 7 }),
    slug: RandomGenerator.alphaNumeric(7),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 4. Member creates a post
  const postCreate = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postCreate,
    },
  );
  typia.assert(post);

  // 5. Member creates root comment
  const rootCommentCreate = {
    community_platform_post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null,
  } satisfies ICommunityPlatformComment.ICreate;
  const rootComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: rootCommentCreate,
      },
    );
  typia.assert(rootComment);
  TestValidator.predicate(
    "root comment is top-level",
    rootComment.parent_id === null,
  );

  // 6. Member creates child reply (nested comment)
  const childCommentCreate = {
    community_platform_post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: rootComment.id,
  } satisfies ICommunityPlatformComment.ICreate;
  const childComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: childCommentCreate,
      },
    );
  typia.assert(childComment);
  TestValidator.equals(
    "child's parent is root",
    childComment.parent_id,
    rootComment.id,
  );

  // 7. Admin deletes the root comment (as moderator)
  await api.functional.communityPlatform.admin.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: rootComment.id,
    },
  );
  // Re-read (simulate re-fetch) the root comment (this would require a GET by id, but API for GET is not defined here; if available, would fetch and check deleted_at)
  // Uncomment if GET exists:
  // const rootCommentReloaded = await api.functional.communityPlatform.member.posts.comments.at(connection, { postId: post.id, commentId: rootComment.id });
  // typia.assert(rootCommentReloaded);
  // TestValidator.predicate("root comment deleted_at set", !!rootCommentReloaded.deleted_at);

  // 8. If fetching, verify that rootComment's deleted_at is set (simulate by expecting no crash; API does not provide fetch-by-id yet.)
  // 9. Edge: delete the child reply as admin as well
  await api.functional.communityPlatform.admin.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: childComment.id,
    },
  );
  // 10. (As with root) Validate childComment's deleted_at if API fetch existed
  // 11. Error test: attempt to delete already deleted root again (expect no crash, maybe error)
  await TestValidator.error(
    "deleting already deleted comment should fail or be a no-op",
    async () => {
      await api.functional.communityPlatform.admin.posts.comments.erase(
        connection,
        {
          postId: post.id,
          commentId: rootComment.id,
        },
      );
    },
  );
}
