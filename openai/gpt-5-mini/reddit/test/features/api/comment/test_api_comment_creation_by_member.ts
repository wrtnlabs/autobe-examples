import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

/**
 * Validate that an authenticated member can create a top-level comment for a
 * post.
 *
 * Steps:
 *
 * 1. Register a new member (auth.member.join) and obtain authorization (SDK
 *    manages headers).
 * 2. Create a community as the authenticated member.
 * 3. Create a text post in that community.
 * 4. Create a top-level comment for the created post.
 *
 * Validations:
 *
 * - Responses are asserted with typia.assert()
 * - Business expectations validated with TestValidator:
 *
 *   - Comment.post_id matches the created post.id
 *   - Comment.author_user_id equals the created member.id
 *   - Comment.parent_comment_id is null
 *   - Created_at and updated_at are present
 *   - Deleted_at is null or undefined (not set)
 */
export async function test_api_comment_creation_by_member(
  connection: api.IConnection,
) {
  // 1) Register member
  const username = `user_${RandomGenerator.alphaNumeric(6)}`;
  const email = typia.random<string & tags.Format<"email">>();

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password: "P@ssw0rd!23",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(member);

  // 2) Create community
  const communityName = RandomGenerator.name();
  const communitySlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: communityName,
        slug: communitySlug,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3) Create a text post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: postTitle,
        body: postBody,
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 4) Create a top-level comment on the post
  const commentBody = RandomGenerator.paragraph({ sentences: 5 });

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: commentBody,
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(comment);

  // Business validations
  TestValidator.equals(
    "comment post_id matches created post",
    comment.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author_user_id matches authenticated member",
    comment.author_user_id,
    member.id,
  );
  TestValidator.predicate(
    "parent_comment_id is null",
    comment.parent_comment_id === null,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof comment.updated_at === "string" && comment.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );
}
