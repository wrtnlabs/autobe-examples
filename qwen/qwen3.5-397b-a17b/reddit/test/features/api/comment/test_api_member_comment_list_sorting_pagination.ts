import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_vote } from "../../../generate/generate_random_reddit_community_member_comments_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_member_comment_list_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments with different content
  const comment1 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "First comment - will be upvoted" },
        params: { postId: post.id },
      },
    );
  typia.assert(comment1);
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment2 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Second comment - will be downvoted" },
        params: { postId: post.id },
      },
    );
  typia.assert(comment2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment3 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Third comment - neutral votes" },
        params: { postId: post.id },
      },
    );
  typia.assert(comment3);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment4 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Fourth comment - highly upvoted" },
        params: { postId: post.id },
      },
    );
  typia.assert(comment4);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment5 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: { content: "Fifth comment - mixed votes" },
        params: { postId: post.id },
      },
    );
  typia.assert(comment5);
  // 6. Vote on comments to establish different vote scores
  // Upvote comment1
  const voteResult1 =
    await generate_random_reddit_community_member_comments_vote(
      memberConnection,
      {
        body: { direction: "UPVOTE" },
        params: { commentId: comment1.id },
      },
    );
  typia.assert(voteResult1);
  // Downvote comment2
  const voteResult2 =
    await generate_random_reddit_community_member_comments_vote(
      memberConnection,
      {
        body: { direction: "DOWNVOTE" },
        params: { commentId: comment2.id },
      },
    );
  typia.assert(voteResult2);
  // Upvote comment4
  const voteResult4 =
    await generate_random_reddit_community_member_comments_vote(
      memberConnection,
      {
        body: { direction: "UPVOTE" },
        params: { commentId: comment4.id },
      },
    );
  typia.assert(voteResult4);
  // 7. Test 'best' sorting (highest voted first)
  const bestSorted =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "best",
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(bestSorted);
  TestValidator.predicate(
    "best sort returns comments",
    bestSorted.data.length >= 5,
  );
  TestValidator.equals(
    "best sort pagination current",
    bestSorted.pagination.current,
    1,
  );
  // 8. Test 'new' sorting (most recent first)
  const newSorted =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "new",
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(newSorted);
  TestValidator.predicate(
    "new sort returns comments",
    newSorted.data.length >= 5,
  );
  // Verify newest comment is first in 'new' sort
  if (newSorted.data.length >= 1) {
    TestValidator.equals(
      "newest comment first in new sort",
      newSorted.data[0].id,
      comment5.id,
    );
  }
  // 9. Test 'controversial' sorting
  const controversialSorted =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "controversial",
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(controversialSorted);
  TestValidator.predicate(
    "controversial sort returns comments",
    controversialSorted.data.length >= 5,
  );
  // 10. Test pagination with limit=3
  const page1 =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "new",
          limit: 3,
          page: 1,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.data.length, 3);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate(
    "page 1 has total records",
    page1.pagination.records >= 5,
  );
  TestValidator.predicate(
    "page 1 has multiple pages",
    page1.pagination.pages >= 2,
  );
  // Get page 2
  const page2 =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "new",
          limit: 3,
          page: 2,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.predicate(
    "page 2 has remaining comments",
    page2.data.length >= 2,
  );
  // Verify pages have different comments
  const page1Ids = page1.data.map((c) => c.id);
  const page2Ids = page2.data.map((c) => c.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("pagination pages have unique comments", !hasOverlap);
  // 11. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24 hours ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours ahead
  const dateFiltered =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "new",
          limit: 10,
          created_at_from: pastDate.toISOString(),
          created_at_to: futureDate.toISOString(),
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filtered returns comments within range",
    dateFiltered.data.length >= 5,
  );
  // Verify all returned comments are within date range
  for (const comment of dateFiltered.data) {
    const commentDate = new Date(comment.created_at);
    TestValidator.predicate(
      `comment ${comment.id} created_at >= from`,
      commentDate >= pastDate,
    );
    TestValidator.predicate(
      `comment ${comment.id} created_at <= to`,
      commentDate <= futureDate,
    );
  }
}
