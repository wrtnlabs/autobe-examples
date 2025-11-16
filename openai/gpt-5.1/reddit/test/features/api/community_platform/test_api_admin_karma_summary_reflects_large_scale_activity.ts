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

/**
 * Stress-test karma summary aggregation with multiple member users,
 * communities, posts, comments, and votes, then validate that the admin
 * analytics endpoint returns a consistent
 * ICommunityPlatformKarmaSummaryStatistics snapshot.
 *
 * Steps:
 *
 * 1. Create an adminUser via join and keep its credentials.
 * 2. Create several member users via join and keep their credentials.
 * 3. As the first member user, create a community with permissive posting
 *    configuration.
 * 4. For each member user, join the community, create a couple of posts, and
 *    create comments on those posts.
 * 5. Apply a voting pattern across posts and comments so that some users receive
 *    many upvotes while others receive few or none, creating a varied karma
 *    distribution without depending on exact scoring rules.
 * 6. Re-authenticate as adminUser and call the karma summary endpoint.
 * 7. Assert schema correctness and perform sanity checks on aggregate metrics such
 *    as active_user_count, total_karma_sum, and percentile/average
 *    relationships.
 */
export async function test_api_admin_karma_summary_reflects_large_scale_activity(
  connection: api.IConnection,
) {
  // 1. Admin join and keep credentials
  const adminUsername: string = RandomGenerator.name(1).replace(/\s+/g, "_");
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPass123!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create several member users
  const MEMBER_COUNT = 5;
  const memberCredentials: {
    username: string;
    email: string & tags.Format<"email">;
    password: string;
  }[] = ArrayUtil.repeat(MEMBER_COUNT, (index) => {
    const username = `${RandomGenerator.name(1).replace(/\s+/g, "_")}_${index}`;
    const email = typia.random<string & tags.Format<"email">>();
    const password = "MemberPass123!";
    return { username, email, password };
  });

  const memberAuthorizedList: ICommunityPlatformMemberuser.IAuthorized[] = [];

  for (const creds of memberCredentials) {
    const joinBody = {
      username: creds.username,
      email: creds.email,
      password: creds.password,
      ip: null,
      href: "https://community.local/join",
      referrer: "https://community.local/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin;

    const authorized: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: joinBody,
      });
    typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);
    memberAuthorizedList.push(authorized);
  }

  // 3. As first member, create a community
  const firstMemberCreds = memberCredentials[0];
  const firstMemberLoginBody = {
    identifier: firstMemberCreds.username,
    password: firstMemberCreds.password,
    ip: null,
    href: "https://community.local/login",
    referrer: "https://community.local",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const firstMemberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: firstMemberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(firstMemberAuth);

  const communitySlug: string = RandomGenerator.alphabets(8);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as
      | (string & tags.MaxLength<4000>)
      | null
      | undefined,
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
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. For each member: login, join community, create posts and comments
  const postsByMember: ICommunityPlatformPost[][] = [];
  const commentsPerPost: Map<string, ICommunityPlatformComment[]> = new Map();

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const creds = memberCredentials[i];
    const loginBody = {
      identifier: creds.username,
      password: creds.password,
      ip: null,
      href: "https://community.local/login",
      referrer: "https://community.local",
    } satisfies ICommunityPlatformMemberuser.ILogin;

    const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.login(connection, {
        body: loginBody,
      });
    typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuth);

    // Join community
    const membershipBody = {
      role: "member",
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

    // Create posts
    const memberPosts: ICommunityPlatformPost[] = [];
    const POSTS_PER_MEMBER = 2;

    for (let p = 0; p < POSTS_PER_MEMBER; p++) {
      const postBody = {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.paragraph({ sentences: 10 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: postBody },
        );
      typia.assert<ICommunityPlatformPost>(post);
      memberPosts.push(post);

      // Create comments on this post
      const COMMENTS_PER_POST = 2;
      const comments: ICommunityPlatformComment[] = [];

      for (let c = 0; c < COMMENTS_PER_POST; c++) {
        const commentBody = {
          content: RandomGenerator.paragraph({ sentences: 2 }) as string &
            tags.MinLength<1> &
            tags.MaxLength<10000>,
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
        comments.push(comment);
      }

      commentsPerPost.set(post.id, comments);
    }

    postsByMember.push(memberPosts);
  }

  // 5. Voting pattern across posts and comments
  // For voting, iterate over voters (members) and targets (posts/comments).
  for (let voterIndex = 0; voterIndex < MEMBER_COUNT; voterIndex++) {
    const voterCreds = memberCredentials[voterIndex];
    const loginBody = {
      identifier: voterCreds.username,
      password: voterCreds.password,
      ip: null,
      href: "https://community.local/login",
      referrer: "https://community.local",
    } satisfies ICommunityPlatformMemberuser.ILogin;

    const voterAuth: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.login(connection, {
        body: loginBody,
      });
    typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterAuth);

    for (let authorIndex = 0; authorIndex < MEMBER_COUNT; authorIndex++) {
      const authorPosts = postsByMember[authorIndex];
      for (let p = 0; p < authorPosts.length; p++) {
        const post = authorPosts[p];

        // Voting rule:
        // - Everyone upvotes posts from member 0.
        // - Only some users upvote posts from member 1 and 2.
        // - No one votes posts from the last member.
        let shouldVotePost = false;
        if (authorIndex === 0 && voterIndex !== authorIndex) {
          shouldVotePost = true;
        } else if (
          (authorIndex === 1 || authorIndex === 2) &&
          voterIndex % 2 === 0 &&
          p === 0
        ) {
          shouldVotePost = true;
        }

        if (shouldVotePost) {
          const voteBody = {
            direction: "up",
          } satisfies ICommunityPlatformPostVote.ICreate;

          const postVote: ICommunityPlatformPostVote =
            await api.functional.communityPlatform.memberUser.posts.votes.create(
              connection,
              {
                postId: post.id as string & tags.Format<"uuid">,
                body: voteBody,
              },
            );
          typia.assert<ICommunityPlatformPostVote>(postVote);
        }

        // Comment votes: give extra weight to member 0's comments
        const comments = commentsPerPost.get(post.id) ?? [];
        for (let c = 0; c < comments.length; c++) {
          const comment = comments[c];
          let shouldVoteComment = false;
          if (authorIndex === 0 && voterIndex !== authorIndex) {
            // half of the voters vote on first comment
            shouldVoteComment = c === 0 && voterIndex % 2 === 1;
          }

          if (shouldVoteComment) {
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
            typia.assert<ICommunityPlatformCommentVote>(commentVote);
          }
        }
      }
    }
  }

  // 6. Re-authenticate as adminUser
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://community.local/admin/login",
    referrer: "https://community.local",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginAuthorized);

  // 7. Call karma summary endpoint
  const summary: ICommunityPlatformKarmaSummaryStatistics =
    await api.functional.communityPlatform.adminUser.statistics.karma.summary.index(
      connection,
    );
  typia.assert<ICommunityPlatformKarmaSummaryStatistics>(summary);

  // 8. Sanity checks on aggregated metrics
  TestValidator.predicate(
    "active_user_count is non-negative",
    summary.active_user_count >= 0,
  );

  // We expect at least some active users when we have created votes
  TestValidator.predicate(
    "active_user_count is at least 1 when we generated activity",
    summary.active_user_count >= 1,
  );

  TestValidator.predicate(
    "total_post_karma_sum is non-negative",
    summary.total_post_karma_sum >= 0,
  );
  TestValidator.predicate(
    "total_comment_karma_sum is non-negative",
    summary.total_comment_karma_sum >= 0,
  );
  TestValidator.predicate(
    "total_karma_sum is non-negative",
    summary.total_karma_sum >= 0,
  );

  if (summary.active_user_count > 0) {
    // If average_total_karma is non-null, it should be within [min, max]
    if (
      summary.average_total_karma !== null &&
      summary.average_total_karma !== undefined &&
      summary.min_total_karma !== null &&
      summary.min_total_karma !== undefined &&
      summary.max_total_karma !== null &&
      summary.max_total_karma !== undefined
    ) {
      TestValidator.predicate(
        "average_total_karma is at least min_total_karma",
        summary.average_total_karma >= summary.min_total_karma,
      );
      TestValidator.predicate(
        "average_total_karma is at most max_total_karma",
        summary.average_total_karma <= summary.max_total_karma,
      );
    }

    if (
      summary.max_total_karma !== null &&
      summary.max_total_karma !== undefined &&
      summary.median_total_karma !== null &&
      summary.median_total_karma !== undefined
    ) {
      TestValidator.predicate(
        "max_total_karma is at least median_total_karma",
        summary.max_total_karma >= summary.median_total_karma,
      );
    }

    if (
      summary.p99_total_karma !== null &&
      summary.p99_total_karma !== undefined &&
      summary.p90_total_karma !== null &&
      summary.p90_total_karma !== undefined
    ) {
      TestValidator.predicate(
        "p99_total_karma is at least p90_total_karma",
        summary.p99_total_karma >= summary.p90_total_karma,
      );
    }
  }
}
