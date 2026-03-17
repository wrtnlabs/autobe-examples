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
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test comment history sorting strategies and date range filtering.
 *
 * This test verifies the PATCH /redditClone/member/members/{memberId}/comments endpoint
 * supports multiple sorting strategies (best, controversial, new) and filtering options
 * (date range, search text).
 */
export async function test_api_member_comment_sorting_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (viewer)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create member B (comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create community owned by member A
  const community = await generate_random_reddit_clone_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Create post in the community by member A
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments by member B with different content for search testing
  const commentBodies = [
    "This is an excellent post with great insights",
    "I completely disagree with this perspective",
    "Thanks for sharing this information",
    "Could you elaborate more on this topic",
    "Amazing content as always",
  ];
  const comments: IRedditCloneComment[] = [];
  for (const body of commentBodies) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberBConnection,
        {
          body: { body },
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 6. Test 'best' sort (highest vote_score first)
  const bestSortResult =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          sort: "best",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(bestSortResult);
  TestValidator.predicate(
    "best sort returns comments",
    bestSortResult.data.length > 0,
  );
  // 7. Test 'controversial' sort (ABS(vote_score) closest to zero first)
  const controversialSortResult =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(controversialSortResult);
  TestValidator.predicate(
    "controversial sort returns comments",
    controversialSortResult.data.length > 0,
  );
  // 8. Test 'new' sort (most recent first)
  const newSortResult =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(newSortResult);
  TestValidator.predicate(
    "new sort returns comments",
    newSortResult.data.length > 0,
  );
  // 9. Test date range filter with past date to ensure comments are within range
  const dateFrom = new Date(comments[0].created_at);
  dateFrom.setDate(dateFrom.getDate() - 1); // 1 day before first comment
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 1); // 1 day from now
  const dateRangeResult =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns comments",
    dateRangeResult.data.length > 0,
  );
  // Verify all returned comments are within date range
  for (const comment of dateRangeResult.data) {
    TestValidator.predicate(
      "comment within date range",
      comment.created_at >= dateFrom.toISOString() &&
        comment.created_at <= dateTo.toISOString(),
    );
  }
  // 10. Test search filter with text from specific comment
  const searchTerm = "excellent";
  const searchResult =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify search results contain the search term
  for (const comment of searchResult.data) {
    TestValidator.predicate(
      `search result contains "${searchTerm}"`,
      comment.body.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // 11. Test search with non-matching term returns empty or filtered results
  const noMatchSearch =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          search: "xyznonexistent123",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.predicate(
    "non-matching search returns empty or filtered",
    noMatchSearch.data.length < comments.length,
  );
  // 12. Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current page valid",
    bestSortResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    bestSortResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    bestSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    bestSortResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    bestSortResult.pagination.records >= bestSortResult.data.length,
  );
}
