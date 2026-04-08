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
 * Test that comment history retrieval correctly handles pagination when a member has many comments.
 *
 * Validates the complete comment history pagination flow including member registration, community creation, post creation, bulk comment creation, and paginated comment history retrieval. Ensures that pagination metadata is accurate and that comments are properly sorted by creation date.
 *
 * Special attention is given to verifying that comments are sorted by createdAt DESC (newest first), pagination metadata correctly reflects total records and pages, and that the returned data respects the pagination limit.
 *
 * 1. Member registers with unique credentials and receives authentication token.
 * 2. Member creates a community they own.
 * 3. Member creates a post in their community.
 * 4. Member creates 25 comments on the post to exceed typical page limit.
 * 5. Retrieves comment history and validates pagination metadata.
 * 6. Validates comment ordering (newest first) and data structure.
 */
export async function test_api_member_comment_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
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
  const username = memberAuth.username;
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
      },
    },
  );
  typia.assert(post);
  // 4. Create 25 comments on the post to test pagination
  const commentCount = 25;
  const createdCommentIds: string[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_reddit_community_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    createdCommentIds.push(comment.id);
  }
  // 5. Retrieve comment history with pagination
  const result =
    await api.functional.redditCommunity.member.members.comments.list(
      memberConnection,
      {
        username: username,
      },
    );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.equals(
    "total records matches created comments",
    result.pagination.records,
    commentCount,
  );
  TestValidator.predicate(
    "total pages is calculated correctly",
    result.pagination.pages >= 1,
  );
  // 7. Validate data array respects limit
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= result.pagination.limit,
  );
  TestValidator.predicate("data length is positive", result.data.length > 0);
  // 8. Validate all returned comments belong to the member
  for (const comment of result.data) {
    TestValidator.equals(
      "comment author username matches",
      comment.author.username,
      username,
    );
    TestValidator.predicate(
      "comment id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(comment.id),
    );
  }
  // 9. Validate comments are sorted by createdAt DESC (newest first)
  for (let i = 1; i < result.data.length; i++) {
    const prevDate = new Date(result.data[i - 1].createdAt).getTime();
    const currDate = new Date(result.data[i].createdAt).getTime();
    TestValidator.predicate(
      `comment ${i} createdAt is >= comment ${i + 1} createdAt (DESC order)`,
      prevDate >= currDate,
    );
  }
  // 10. Validate pagination math: pages = ceiling(records / limit)
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages matches pagination.pages",
    result.pagination.pages,
    expectedPages,
  );
  // 11. Validate each comment has required fields
  for (const comment of result.data) {
    TestValidator.predicate("comment has id", comment.id !== undefined);
    TestValidator.predicate("comment has author", comment.author !== undefined);
    TestValidator.predicate(
      "comment has content",
      comment.content !== undefined,
    );
    TestValidator.predicate(
      "comment has createdAt",
      comment.createdAt !== undefined,
    );
    TestValidator.predicate(
      "comment has voteScore",
      comment.voteScore !== undefined,
    );
    TestValidator.predicate(
      "comment has repliesCount",
      comment.repliesCount !== undefined,
    );
    TestValidator.predicate(
      "comment has post reference",
      comment.post !== undefined,
    );
  }
}
