import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

export async function test_api_comment_retrieval_success_public(
  connection: api.IConnection,
) {
  /**
   * End-to-end test:
   *
   * 1. Register a new member (used for setup).
   * 2. Create a public community (is_private=false, visibility="public").
   * 3. Create a text post in that community.
   * 4. Create a top-level comment on the post (parent_comment_id = null).
   * 5. Using an unauthenticated connection, GET the comment and assert fields.
   */

  // 1) Member registration (setup)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(8);
  const memberDisplay = RandomGenerator.name();

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "Test@1234",
        display_name: memberDisplay,
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(member);

  // 2) Create public community
  const communityCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3) Create a text post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4) Create a top-level comment on the post
  const commentBodyText = RandomGenerator.paragraph({ sentences: 4 });
  const commentRequestBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: commentBodyText,
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentRequestBody,
      },
    );
  typia.assert(comment);

  // 5) Retrieve the comment as an unauthenticated public caller
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const read: ICommunityPortalComment =
    await api.functional.communityPortal.posts.comments.at(publicConn, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(read);

  // Validations
  TestValidator.equals(
    "retrieved comment id matches created comment",
    read.id,
    comment.id,
  );
  TestValidator.equals(
    "retrieved comment belongs to post",
    read.post_id,
    post.id,
  );
  TestValidator.equals(
    "retrieved comment parent is null (top-level)",
    read.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "retrieved comment body matches created body",
    read.body,
    comment.body,
  );
  TestValidator.equals(
    "retrieved comment is not deleted (deleted_at null)",
    read.deleted_at,
    null,
  );

  // Author presence: the DTO provides author_user_id (nullable). Assert it is either null or a uuid string.
  TestValidator.predicate(
    "author_user_id is present or null",
    read.author_user_id === null || typeof read.author_user_id === "string",
  );
}
