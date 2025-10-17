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

export async function test_api_user_comments_profile_list(
  connection: api.IConnection,
) {
  // 1) Register a new member (commentAuthor) and obtain auth token
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: authorEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(author);

  // 2) Create a public community using the author token
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: `community-${RandomGenerator.alphaNumeric(5)}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3) Create a text post in that community
  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 4) Create two comments under the post: one top-level and one reply
  const topComment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(topComment);

  const replyComment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: topComment.id,
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // 5) As an unauthenticated caller, retrieve the user's public comments
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const pageAll: IPageICommunityPortalComment.ISummary =
    await api.functional.communityPortal.users.comments.index(publicConn, {
      userId: author.id,
      body: {
        limit: 10,
        offset: 0,
      } satisfies ICommunityPortalComment.IRequest,
    });
  typia.assert(pageAll);

  // Validate returned items include our created comments
  TestValidator.predicate(
    "profile comments should include top-level comment",
    pageAll.data.some((c) => c.id === topComment.id),
  );
  TestValidator.predicate(
    "profile comments should include reply comment",
    pageAll.data.some((c) => c.id === replyComment.id),
  );

  // Additional pagination check: server honored our requested limit
  TestValidator.predicate(
    "pagination limit should be 10",
    pageAll.pagination.limit === 10,
  );

  // 6) Test reply-filtering: request comments whose parent_comment_id == topComment.id
  const pageReplies: IPageICommunityPortalComment.ISummary =
    await api.functional.communityPortal.users.comments.index(publicConn, {
      userId: author.id,
      body: {
        parentCommentId: topComment.id,
        limit: 10,
        offset: 0,
      } satisfies ICommunityPortalComment.IRequest,
    });
  typia.assert(pageReplies);

  TestValidator.predicate(
    "reply filter should return the reply comment",
    pageReplies.data.some(
      (c) => c.id === replyComment.id && c.parent_comment_id === topComment.id,
    ),
  );

  // 7) Test includeDeleted restriction: unauthenticated caller requesting includeDeleted should fail
  await TestValidator.error(
    "unauthenticated includeDeleted request should be rejected",
    async () => {
      await api.functional.communityPortal.users.comments.index(publicConn, {
        userId: author.id,
        body: {
          includeDeleted: true,
          limit: 10,
          offset: 0,
        } satisfies ICommunityPortalComment.IRequest,
      });
    },
  );
}
