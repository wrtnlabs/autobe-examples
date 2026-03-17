import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_comments_vote_post_by_commentid } from "../../../generate/generate_random_reddit_clone_member_comments_vote_post_by_commentid";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";
import { prepare_random_reddit_clone_vote } from "../../../prepare/prepare_random_reddit_clone_vote";

/**
 * Test threaded comment structure with nested replies and different sorting strategies.
 *
 * This test validates:
 * 1. Community and post creation workflow
 * 2. Multiple members creating top-level comments
 * 3. Nested reply structure with parent_comment_id references
 * 4. Vote score computation and sorting strategies (best, new, controversial)
 * 5. Pagination with limit and page metadata validation
 */
export async function test_api_post_comment_threaded_reply_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Owner creates community and post
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  const post = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 2. Create multiple member connections and subscribe them
  const memberConnections: api.IConnection[] = [];
  const memberAuths: IRedditCloneMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConn: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        username: RandomGenerator.name(1) + i,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
    typia.assert(memberAuth);
    memberConnections.push(memberConn);
    memberAuths.push(memberAuth);
    // Subscribe to community
    await generate_random_reddit_clone_member_subscriptions_create(memberConn, {
      body: {
        community_id: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    });
  }
  // 3. Create top-level comments from different members
  const topLevelComments: IRedditCloneComment[] = [];
  for (let i = 0; i < 5; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnections[i],
        {
          params: { postId: post.id },
          body: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
            parent_comment_id: null,
          } satisfies IRedditCloneComment.ICreate,
        },
      );
    typia.assert(comment);
    topLevelComments.push(comment);
  }
  // 4. Create reply comments (nested threads)
  const replyComments: IRedditCloneComment[] = [];
  // Reply to first top-level comment from 3 different members
  for (let i = 1; i < 4; i++) {
    const reply =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnections[i],
        {
          params: { postId: post.id },
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            parent_comment_id: topLevelComments[0].id,
          } satisfies IRedditCloneComment.ICreate,
        },
      );
    typia.assert(reply);
    replyComments.push(reply);
  }
  // Reply to second top-level comment from 2 members
  for (let i = 2; i < 4; i++) {
    const reply =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnections[i],
        {
          params: { postId: post.id },
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            parent_comment_id: topLevelComments[1].id,
          } satisfies IRedditCloneComment.ICreate,
        },
      );
    typia.assert(reply);
    replyComments.push(reply);
  }
  // 5. Cast votes on comments to create different vote scores
  // Upvote first comment heavily
  for (let i = 0; i < 5; i++) {
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      memberConnections[i],
      {
        params: { commentId: topLevelComments[0].id },
        body: { vote_type: "UPVOTE" } satisfies IRedditCloneVote.ICreate,
      },
    );
  }
  // Downvote second comment
  for (let i = 0; i < 3; i++) {
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      memberConnections[i],
      {
        params: { commentId: topLevelComments[1].id },
        body: { vote_type: "DOWNVOTE" } satisfies IRedditCloneVote.ICreate,
      },
    );
  }
  // Mixed votes on third comment (controversial - close to zero)
  await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
    memberConnections[0],
    {
      params: { commentId: topLevelComments[2].id },
      body: { vote_type: "UPVOTE" } satisfies IRedditCloneVote.ICreate,
    },
  );
  await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
    memberConnections[1],
    {
      params: { commentId: topLevelComments[2].id },
      body: { vote_type: "DOWNVOTE" } satisfies IRedditCloneVote.ICreate,
    },
  );
  // 6. Fetch all comments without limit for validation
  const allComments = await api.functional.redditClone.posts.comments.index(
    ownerConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        limit: 100,
        page: 1,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(allComments);
  // 7. Test sorting strategy: 'best' (highest vote score first)
  const bestSorted = await api.functional.redditClone.posts.comments.index(
    ownerConnection,
    {
      postId: post.id,
      body: {
        sort: "best",
        limit: 10,
        page: 1,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(bestSorted);
  TestValidator.predicate("best sort - first comment has highest score", () => {
    if (bestSorted.data.length < 2) return true;
    return bestSorted.data[0].vote_score >= bestSorted.data[1].vote_score;
  });
  TestValidator.equals(
    "pagination - best sort current page",
    bestSorted.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination - best sort has records",
    () => bestSorted.pagination.records > 0,
  );
  // 8. Test sorting strategy: 'new' (most recent first)
  const newSorted = await api.functional.redditClone.posts.comments.index(
    ownerConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        limit: 10,
        page: 1,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate(
    "new sort - comments ordered by creation date",
    () => {
      for (let i = 1; i < newSorted.data.length; i++) {
        if (newSorted.data[i].created_at > newSorted.data[i - 1].created_at) {
          return false;
        }
      }
      return true;
    },
  );
  // 9. Test sorting strategy: 'controversial' (close to zero vote score)
  const controversialSorted =
    await api.functional.redditClone.posts.comments.index(ownerConnection, {
      postId: post.id,
      body: {
        sort: "controversial",
        limit: 10,
        page: 1,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(controversialSorted);
  // 10. Test pagination with limit=5
  const paginated = await api.functional.redditClone.posts.comments.index(
    ownerConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        limit: 5,
        page: 1,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination - limit respected",
    () => paginated.data.length <= 5,
  );
  TestValidator.equals(
    "pagination - limit value",
    paginated.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination - pages calculated",
    () => paginated.pagination.pages >= 1,
  );
  // 11. Validate reply_count on parent comments from full list
  const firstCommentData = allComments.data.find(
    (c) => c.id === topLevelComments[0].id,
  );
  TestValidator.predicate("reply_count - first comment has 3 replies", () => {
    return firstCommentData?.reply_count === 3;
  });
  const secondCommentData = allComments.data.find(
    (c) => c.id === topLevelComments[1].id,
  );
  TestValidator.predicate("reply_count - second comment has 2 replies", () => {
    return secondCommentData?.reply_count === 2;
  });
  // 12. Validate parent_comment_id on reply comments
  const replyCommentIds = replyComments.map((c) => c.id);
  const replyCommentsInList = allComments.data.filter((c) =>
    replyCommentIds.includes(c.id),
  );
  for (const reply of replyCommentsInList) {
    TestValidator.predicate(`reply ${reply.id} has parent reference`, () => {
      return reply.parent !== null;
    });
  }
  // 13. Validate vote scores
  const firstCommentInList = allComments.data.find(
    (c) => c.id === topLevelComments[0].id,
  );
  TestValidator.predicate("vote_score - first comment positive", () => {
    return (
      firstCommentInList !== undefined && firstCommentInList.vote_score > 0
    );
  });
  const secondCommentInList = allComments.data.find(
    (c) => c.id === topLevelComments[1].id,
  );
  TestValidator.predicate("vote_score - second comment negative", () => {
    return (
      secondCommentInList !== undefined && secondCommentInList.vote_score < 0
    );
  });
  // 14. Validate total records count matches expected
  const expectedTotalComments = topLevelComments.length + replyComments.length;
  TestValidator.equals(
    "pagination - total records count",
    allComments.pagination.records,
    expectedTotalComments,
  );
}
