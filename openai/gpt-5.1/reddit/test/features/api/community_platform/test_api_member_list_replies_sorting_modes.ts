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

export async function test_api_member_list_replies_sorting_modes(
  connection: api.IConnection,
) {
  // 1. Register a member user (auth join) to obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(6),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches input",
    community.slug,
    communityCreateBody.slug,
  );

  // 3. Join the community as a member
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership community slug should match",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "created post community id matches",
    post.community_id,
    community.id,
  );

  // 5. Create a parent comment on the post
  const parentCommentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentBody,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment post id matches",
    parentComment.post.id,
    post.id,
  );

  // 6. Create several replies under that parent comment
  const replyBodies: ICommunityPlatformCommentReply.ICreate[] = [
    {
      body: "First reply body - for createdAtAsc test",
      format: "plain",
      replyContext: "context-1",
    },
    {
      body: "Second reply body - middle",
      format: "plain",
      replyContext: "context-2",
    },
    {
      body: "Third reply body - last",
      format: "plain",
      replyContext: "context-3",
    },
  ] satisfies ICommunityPlatformCommentReply.ICreate[];

  const createdReplies: ICommunityPlatformCommentReply[] = [];
  for (const body of replyBodies) {
    const reply =
      await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
        connection,
        {
          postId: post.id,
          commentId: parentComment.id,
          body,
        },
      );
    typia.assert(reply);
    createdReplies.push(reply);
  }

  TestValidator.predicate(
    "at least three replies should be created",
    createdReplies.length >= 3,
  );

  const createdReplyIds = createdReplies.map((r) => r.id);

  // Helper to assert that a list of summaries contains all created reply ids
  const assertContainsAllReplies = (
    title: string,
    summaries: ICommunityPlatformCommentReply.ISummary[],
  ) => {
    const ids = summaries.map((s) => s.id);
    for (const id of createdReplyIds) {
      TestValidator.predicate(
        `${title} - contains reply ${id}`,
        ids.includes(id),
      );
    }
  };

  // Helper to assert order by created_at ascending
  const assertSortedByCreatedAtAsc = (
    title: string,
    summaries: ICommunityPlatformCommentReply.ISummary[],
  ) => {
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1].created_at;
      const curr = summaries[i].created_at;
      TestValidator.predicate(
        `${title} - index ${i - 1} <= ${i}`,
        prev <= curr,
      );
    }
  };

  // Helper to assert order by created_at descending
  const assertSortedByCreatedAtDesc = (
    title: string,
    summaries: ICommunityPlatformCommentReply.ISummary[],
  ) => {
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1].created_at;
      const curr = summaries[i].created_at;
      TestValidator.predicate(
        `${title} - index ${i - 1} >= ${i}`,
        prev >= curr,
      );
    }
  };

  // Helper to assert order by score (upvotes_count - downvotes_count) descending
  const assertSortedByScoreDesc = (
    title: string,
    summaries: ICommunityPlatformCommentReply.ISummary[],
  ) => {
    const scores = summaries.map((s) => s.upvotes_count - s.downvotes_count);
    for (let i = 1; i < scores.length; i++) {
      TestValidator.predicate(
        `${title} - score[${i - 1}] >= score[${i}]`,
        scores[i - 1] >= scores[i],
      );
    }
  };

  // 7. List replies with sortBy = createdAtAsc
  const listAscBody = {
    page: 1,
    limit: 50,
    cursor: undefined,
    sortBy: "createdAtAsc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const ascPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: listAscBody,
      },
    );
  typia.assert(ascPage);

  TestValidator.predicate(
    "createdAtAsc listing returns at least created replies count",
    ascPage.data.length >= createdReplies.length,
  );
  assertContainsAllReplies("createdAtAsc listing", ascPage.data);
  assertSortedByCreatedAtAsc("createdAtAsc listing order", ascPage.data);

  // 8. List replies with sortBy = createdAtDesc
  const listDescBody = {
    page: 1,
    limit: 50,
    cursor: undefined,
    sortBy: "createdAtDesc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const descPage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: listDescBody,
      },
    );
  typia.assert(descPage);

  TestValidator.predicate(
    "createdAtDesc listing returns at least created replies count",
    descPage.data.length >= createdReplies.length,
  );
  assertContainsAllReplies("createdAtDesc listing", descPage.data);
  assertSortedByCreatedAtDesc("createdAtDesc listing order", descPage.data);

  // 9. List replies with sortBy = scoreDesc
  const listScoreBody = {
    page: 1,
    limit: 50,
    cursor: undefined,
    sortBy: "scoreDesc" as const,
    includeModerated: undefined,
    includeRemoved: undefined,
  } satisfies ICommunityPlatformCommentReply.IRequest;

  const scorePage: IPageICommunityPlatformCommentReply.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: listScoreBody,
      },
    );
  typia.assert(scorePage);

  TestValidator.predicate(
    "scoreDesc listing returns at least created replies count",
    scorePage.data.length >= createdReplies.length,
  );
  assertContainsAllReplies("scoreDesc listing", scorePage.data);
  assertSortedByScoreDesc("scoreDesc listing order", scorePage.data);
}
