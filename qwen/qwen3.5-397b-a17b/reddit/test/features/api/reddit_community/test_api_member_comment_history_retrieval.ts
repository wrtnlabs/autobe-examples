import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test member comment history retrieval from profile page.
 *
 * Validates that an authenticated member can successfully retrieve their own comment history from their profile page. The test creates a member account, establishes a community and post, generates multiple comments, and verifies the comment history endpoint returns all comments with correct structure and ordering.
 *
 * The test ensures that comments are returned in descending chronological order (newest first), that all comment metadata is properly populated including author information, vote scores, and post references, and that pagination metadata accurately reflects the total number of comments.
 *
 * 1. Member registers with unique credentials and receives authentication token.
 * 2. Member creates a community they own.
 * 3. Member creates a text post in their community.
 * 4. Member creates 3-5 comments on the post with varying content.
 * 5. Member retrieves their comment history via GET /redditCommunity/member/members/{username}/comments.
 * 6. Validates response structure, comment ordering, author matching, and pagination accuracy.
 */
export async function test_api_member_comment_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberUsername = memberAuth.username;
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create multiple comments on the post
  const commentCount = 4;
  const comments: IRedditCommunityComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_reddit_community_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 + i }),
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 5. Retrieve comment history
  const response =
    await api.functional.redditCommunity.member.members.comments.list(
      memberConnection,
      {
        username: memberUsername,
      },
    );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records count",
    response.pagination.records,
    commentCount,
  );
  TestValidator.equals("data array length", response.data.length, commentCount);
  // Validate each comment's business logic
  for (let i = 0; i < response.data.length; i++) {
    const commentSummary = response.data[i];
    // Validate author matches the member
    TestValidator.equals(
      "author username matches",
      commentSummary.author.username,
      memberUsername,
    );
    // Validate post reference matches created post
    TestValidator.equals("post id matches", commentSummary.post.id, post.id);
    TestValidator.equals(
      "post title matches",
      commentSummary.post.title,
      post.title,
    );
    TestValidator.equals(
      "post type matches",
      commentSummary.post.post_type,
      "text",
    );
    TestValidator.equals(
      "post community id matches",
      commentSummary.post.community.id,
      community.id,
    );
  }
  // Validate comments are sorted by createdAt descending (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentComment = response.data[i];
    const nextComment = response.data[i + 1];
    const currentTime = new Date(currentComment.createdAt).getTime();
    const nextTime = new Date(nextComment.createdAt).getTime();
    TestValidator.predicate(
      `comments sorted descending at index ${i}`,
      currentTime >= nextTime,
    );
  }
}
