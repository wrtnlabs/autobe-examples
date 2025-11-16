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
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaSummaryStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaSummaryStatistics";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

export async function test_api_admin_karma_summary_with_mixed_post_and_comment_activity(
  connection: api.IConnection,
) {
  // 1. Admin joins (becomes authenticated adminUser actor)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfes Format<"password"> semantics
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member joins (authenticated memberUser actor)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
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
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Member joins the community (membership)
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

  // 5. Create multiple posts (mix of text and link)
  const posts: ICommunityPlatformPost[] = [];

  const textPostBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const linkPostBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 4 }),
    url: "https://example.com/article",
    postType: "link",
  } satisfies ICommunityPlatformPost.ICreate;

  const firstPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: textPostBody,
    });
  typia.assert(firstPost);
  posts.push(firstPost);

  const secondPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: linkPostBody,
    });
  typia.assert(secondPost);
  posts.push(secondPost);

  // 6. Create multiple comments on those posts
  const comments: ICommunityPlatformComment[] = [];

  for (const post of posts) {
    const commentBody1 = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformComment.ICreate;

    const comment1: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentBody1,
        },
      );
    typia.assert(comment1);
    comments.push(comment1);

    const commentBody2 = {
      content: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformComment.ICreate;

    const comment2: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentBody2,
        },
      );
    typia.assert(comment2);
    comments.push(comment2);
  }

  // 7. Cast a mixture of upvotes and downvotes on posts and comments
  // For determinism in expectations, we just ensure some upvotes; we do not rely on exact scores.
  for (const [index, post] of posts.entries()) {
    const direction = index === 0 ? "up" : "down";
    const voteBody = {
      direction,
    } satisfies ICommunityPlatformPostVote.ICreate;

    const postVote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: voteBody,
        },
      );
    typia.assert(postVote);
  }

  for (const [index, comment] of comments.entries()) {
    const direction = index % 2 === 0 ? "up" : "down";
    const commentVoteBody = {
      direction,
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const commentVote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: commentVoteBody,
        },
      );
    typia.assert(commentVote);
  }

  // 8. Switch back to adminUser actor via login using the admin credentials
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 9. Call the karma summary endpoint
  const summary: ICommunityPlatformKarmaSummaryStatistics =
    await api.functional.communityPlatform.adminUser.statistics.karma.summary.index(
      connection,
    );
  typia.assert(summary);

  // 10. Validate high-level stats invariants
  TestValidator.predicate(
    "active_user_count should be non-negative",
    summary.active_user_count >= 0,
  );

  TestValidator.predicate(
    "karma sums should be consistent (total >= post+comment is not strictly enforced but basic integer type)",
    typeof summary.total_post_karma_sum === "number" &&
      typeof summary.total_comment_karma_sum === "number" &&
      typeof summary.total_karma_sum === "number",
  );

  if (summary.active_user_count > 0) {
    // When population is non-empty, scalar metrics should not be wildly inconsistent.
    const {
      min_total_karma,
      median_total_karma,
      p90_total_karma,
      p99_total_karma,
      max_total_karma,
      average_total_karma,
    } = summary;

    // All order statistics should be non-null when there is at least one user.
    TestValidator.predicate(
      "min_total_karma should not be null when active users exist",
      min_total_karma !== null && min_total_karma !== undefined,
    );
    TestValidator.predicate(
      "max_total_karma should not be null when active users exist",
      max_total_karma !== null && max_total_karma !== undefined,
    );
    TestValidator.predicate(
      "median_total_karma should not be null when active users exist",
      median_total_karma !== null && median_total_karma !== undefined,
    );
    TestValidator.predicate(
      "p90_total_karma should not be null when active users exist",
      p90_total_karma !== null && p90_total_karma !== undefined,
    );
    TestValidator.predicate(
      "p99_total_karma should not be null when active users exist",
      p99_total_karma !== null && p99_total_karma !== undefined,
    );

    if (
      min_total_karma !== null &&
      min_total_karma !== undefined &&
      median_total_karma !== null &&
      median_total_karma !== undefined &&
      p90_total_karma !== null &&
      p90_total_karma !== undefined &&
      p99_total_karma !== null &&
      p99_total_karma !== undefined &&
      max_total_karma !== null &&
      max_total_karma !== undefined
    ) {
      TestValidator.predicate(
        "ordered statistics should be non-decreasing: min <= median <= p90 <= p99 <= max",
        min_total_karma <= median_total_karma &&
          median_total_karma <= p90_total_karma &&
          p90_total_karma <= p99_total_karma &&
          p99_total_karma <= max_total_karma,
      );

      if (average_total_karma !== null && average_total_karma !== undefined) {
        TestValidator.predicate(
          "average_total_karma should lie between min and max",
          average_total_karma >= min_total_karma &&
            average_total_karma <= max_total_karma,
        );
      }
    }
  }
}
