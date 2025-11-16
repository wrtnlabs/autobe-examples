import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserKarma";

/**
 * Verify that admin user karma search correctly filters by a specific member
 * user.
 *
 * Business flow:
 *
 * 1. Register Member A and Member B as community platform member users.
 * 2. As Member A, create a community.
 * 3. As Member A, create a post inside that community.
 * 4. As Member A, cast an upvote on the post to generate post karma.
 * 5. Optionally, as Member A create a comment and cast an upvote on it to generate
 *    comment karma.
 * 6. Register an adminUser and become authenticated as that admin.
 * 7. As the adminUser, call PATCH /communityPlatform/adminUser/userKarmas with
 *    memberUserId set to Member A's id.
 * 8. Assert that all returned karma summaries belong to Member A and that Member B
 *    does not appear.
 */
export async function test_api_user_karma_search_by_member_user_filter(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);
  const memberAId: string & tags.Format<"uuid"> = memberA.id;

  // 2. Register Member B (no karma activity)
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);
  const memberBId: string & tags.Format<"uuid"> = memberB.id;

  // 3. As Member A (already authenticated from join), create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
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

  // 4. As Member A, create a post in the community
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

  // 5. As Member A, cast an upvote on the post to generate post karma
  const postVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: postVoteBody,
      },
    );
  typia.assert(postVote);

  // 6. Optionally create a comment and upvote it as Member A to add comment karma
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  const commentVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: commentVoteBody,
      },
    );
  typia.assert(commentVote);

  // 7. Register an adminUser and authenticate as admin
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 8. As adminUser, query userKarmas filtered by Member A's id
  const karmaRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortBy: "totalKarma",
    sortDirection: "desc",
    memberUserId: memberAId,
  } satisfies ICommunityPlatformUserKarma.IRequest;

  const karmaPage: IPageICommunityPlatformUserKarma.ISummary =
    await api.functional.communityPlatform.adminUser.userKarmas.index(
      connection,
      {
        body: karmaRequestBody,
      },
    );
  typia.assert(karmaPage);

  const pagination: IPage.IPagination = karmaPage.pagination;
  typia.assert(pagination);

  const summaries: ICommunityPlatformUserKarma.ISummary[] = karmaPage.data;

  // 9. Business assertions
  TestValidator.predicate(
    "karma search by memberUserId returns at least one record for Member A",
    summaries.length > 0,
  );

  // All summaries must belong to Member A, and none to Member B
  for (const summary of summaries) {
    TestValidator.equals(
      "each karma summary must belong to Member A",
      summary.memberuser.id,
      memberAId,
    );
  }

  const memberBPresent = summaries.some((s) => s.memberuser.id === memberBId);
  TestValidator.predicate(
    "no karma summary should belong to Member B when filtering by Member A",
    memberBPresent === false,
  );

  // Optional: verify that Member A's total karma is non-zero after votes
  const firstSummary = summaries[0];
  TestValidator.predicate(
    "Member A total_karma should be non-zero after generating votes",
    firstSummary.total_karma !== 0,
  );
}
