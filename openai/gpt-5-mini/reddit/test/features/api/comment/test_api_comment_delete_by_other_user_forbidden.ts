import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_comment_delete_by_other_user_forbidden(
  connection: api.IConnection,
) {
  // 1) Create two separate connection clones so that SDK auth.join will set
  //    Authorization header independently for each user connection.
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Register author
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword1234",
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, {
      body: authorBody,
    });
  typia.assert(author);

  // 3) Register otherUser
  const otherBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword1234",
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPortalMember.ICreate;

  const otherUser: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, {
      body: otherBody,
    });
  typia.assert(otherUser);

  // 4) As author, create a community
  const communityCreate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: communityCreate,
    });
  typia.assert(community);

  // 5) If community is private, subscribe the author (ensure membership)
  if (community.is_private === true) {
    const subscribeBody = {
      community_id: community.id,
    } satisfies ICommunityPortalSubscription.ICreate;
    const subscription: ICommunityPortalSubscription =
      await api.functional.communityPortal.member.communities.subscriptions.create(
        authorConn,
        {
          communityId: community.id,
          body: subscribeBody,
        },
      );
    typia.assert(subscription);
  }

  // 6) As author, create a text post in the community
  const postCreate = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: postCreate,
    });
  typia.assert(post);

  // 7) As author, create a comment under the post
  const commentCreate = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      authorConn,
      {
        postId: post.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // Ensure the comment is not deleted initially
  TestValidator.equals(
    "created comment has no deleted_at",
    comment.deleted_at,
    null,
  );

  // 8) Using otherUser, attempt to delete the comment -> expect authorization error
  await TestValidator.error(
    "other user cannot delete someone else's comment",
    async () => {
      await api.functional.communityPortal.member.posts.comments.erase(
        otherConn,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );

  // 9) Unauthenticated deletion attempt should be rejected (401)
  await TestValidator.error(
    "unauthenticated user cannot delete comment",
    async () => {
      await api.functional.communityPortal.member.posts.comments.erase(
        unauthConn,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );

  // 10) Confirm the comment still exists by having the author delete it successfully
  //     (erase should succeed without throwing)
  await api.functional.communityPortal.member.posts.comments.erase(authorConn, {
    postId: post.id,
    commentId: comment.id,
  });

  // 11) After deletion, a subsequent delete by the author should fail (404)
  await TestValidator.error(
    "deleting already-deleted comment should fail",
    async () => {
      await api.functional.communityPortal.member.posts.comments.erase(
        authorConn,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
