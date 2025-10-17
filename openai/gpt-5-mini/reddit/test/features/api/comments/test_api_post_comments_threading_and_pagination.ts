import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalComment";

export async function test_api_post_comments_threading_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new test member
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-1",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  TestValidator.equals(
    "community created belongs to name",
    community.name,
    communityBody.name,
  );

  // 3. Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community_id,
    community.id,
  );

  // 4. Create multiple top-level comments for the post
  const topComments: ICommunityPortalComment[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const body = {
        post_id: post.id,
        parent_comment_id: null,
        body: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ICommunityPortalComment.ICreate;

      const comment: ICommunityPortalComment =
        await api.functional.communityPortal.member.posts.comments.create(
          connection,
          {
            postId: post.id,
            body,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  TestValidator.predicate(
    "created top-level comments count",
    topComments.length === 5,
  );

  // 5. For one top-level comment, create multiple replies to form a nested thread
  const parent = topComments[0];
  const replies: ICommunityPortalComment[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const body = {
        post_id: post.id,
        parent_comment_id: parent.id,
        body: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPortalComment.ICreate;

      const reply: ICommunityPortalComment =
        await api.functional.communityPortal.member.posts.comments.create(
          connection,
          {
            postId: post.id,
            body,
          },
        );
      typia.assert(reply);
      return reply;
    },
  );

  TestValidator.predicate("created replies count", replies.length === 3);

  // 6. Retrieve top-level comments with pagination (parentCommentId: null)
  const topPage: IPageICommunityPortalComment.ISummary =
    await api.functional.communityPortal.posts.comments.index(connection, {
      postId: post.id,
      body: {
        limit: 3,
        offset: 0,
        parentCommentId: null,
        includeDeleted: false,
        sort: "new",
        q: null,
      } satisfies ICommunityPortalComment.IRequest,
    });
  typia.assert(topPage);

  // Business validations on top-level page
  TestValidator.equals(
    "pagination limit equals request",
    topPage.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "returned items do not exceed limit",
    topPage.data.length <= topPage.pagination.limit,
  );
  TestValidator.predicate(
    "all returned items belong to the post",
    topPage.data.every((c) => c.post_id === post.id),
  );
  TestValidator.predicate(
    "returned items are top-level (parent_comment_id is null)",
    topPage.data.every((c) => c.parent_comment_id === null),
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    topPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is consistent",
    topPage.pagination.records >= topPage.data.length,
  );

  // 7. Retrieve replies for the selected parentCommentId
  const replyPage: IPageICommunityPortalComment.ISummary =
    await api.functional.communityPortal.posts.comments.index(connection, {
      postId: post.id,
      body: {
        limit: 10,
        offset: 0,
        parentCommentId: parent.id,
        includeDeleted: false,
        sort: "new",
        q: null,
      } satisfies ICommunityPortalComment.IRequest,
    });
  typia.assert(replyPage);

  TestValidator.predicate(
    "reply page items have correct parent",
    replyPage.data.every((c) => c.parent_comment_id === parent.id),
  );

  TestValidator.predicate(
    "reply count is at least created replies",
    replyPage.data.length >= replies.length,
  );
}
