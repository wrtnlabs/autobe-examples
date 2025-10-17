import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

export async function test_api_comment_retrieval_not_found_for_deleted_comment(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Register a member, create community, post, and comment as that member.
   * - Soft-delete the comment as the same member.
   * - Attempt to retrieve the deleted comment with an unauthenticated connection
   *   and assert that the retrieval fails (no deleted content returned).
   *
   * Business rationale: Deleted content must not be returned in public APIs.
   */

  // 1) Register a fresh member (authentication). SDK will set Authorization on connection.
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a community as the authenticated member
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Create a text post in the community
  const postCreate = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 4) Create a top-level comment under the post
  const commentBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // Ensure created comment references the right post
  TestValidator.equals(
    "created comment belongs to post",
    comment.post_id,
    post.id,
  );

  // 5) Soft-delete the comment as the same member (authenticated)
  await api.functional.communityPortal.member.posts.comments.erase(connection, {
    postId: post.id,
    commentId: comment.id,
  });

  // 6) Attempt to retrieve the deleted comment as an unauthenticated caller.
  // Create unauthenticated connection copy (do not modify original connection.headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // The GET must fail (deleted comments must not be returned). We assert an
  // error is thrown. Do NOT assert specific HTTP status codes per test rules.
  await TestValidator.error(
    "deleted comment should not be retrievable",
    async () => {
      await api.functional.communityPortal.posts.comments.at(unauthConn, {
        postId: post.id,
        commentId: comment.id,
      });
    },
  );
}
