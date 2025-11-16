import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReply";

export async function test_api_member_list_replies_unauthorized_access_without_auth(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Join the community as a member
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create a parent comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. Create multiple replies under the parent comment
  const replyCount = 3;
  const replies: ICommunityPlatformCommentReply[] = [];

  for (let i = 0; i < replyCount; i++) {
    const replyBody = {
      body: RandomGenerator.paragraph({ sentences: 2 }),
      format: "plain" as const,
      replyContext: undefined,
    } satisfies ICommunityPlatformCommentReply.ICreate;

    const reply: ICommunityPlatformCommentReply =
      await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: comment.id as string & tags.Format<"uuid">,
          body: replyBody,
        },
      );
    typia.assert<ICommunityPlatformCommentReply>(reply);
    replies.push(reply);
  }

  // Prepare a minimal, valid request body for listing replies
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  // 7. Build an unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Ensure that unauthorized access to replies listing fails
  await TestValidator.error(
    "unauthenticated memberUser cannot list comment replies",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
        unauthenticatedConnection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: comment.id as string & tags.Format<"uuid">,
          body: listRequestBody,
        },
      );
    },
  );

  // 9. Confirm that the same listing operation succeeds with a valid token
  const page: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: comment.id as string & tags.Format<"uuid">,
        body: listRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommentReply.ISummary>(page);

  // 10. Validate pagination and data consistency
  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination.records should be at least number of created replies",
    pagination.records >= replies.length,
  );

  TestValidator.equals(
    "pagination.limit should match requested limit",
    pagination.limit,
    listRequestBody.limit,
  );

  TestValidator.predicate(
    "replies listing should return at least one item",
    page.data.length > 0,
  );

  // All items in data should belong to the same post and parent comment
  for (const summary of page.data) {
    typia.assert<ICommunityPlatformCommentReply.ISummary>(summary);

    TestValidator.equals(
      "reply summary post_id should match created post.id",
      summary.post_id,
      post.id as string & tags.Format<"uuid">,
    );

    TestValidator.equals(
      "reply summary parent_comment_id should match parent comment.id",
      summary.parent_comment_id,
      comment.id as string & tags.Format<"uuid">,
    );
  }
}
