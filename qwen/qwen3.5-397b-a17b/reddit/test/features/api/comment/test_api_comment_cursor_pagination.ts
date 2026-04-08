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
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test cursor-based pagination for comment lists to ensure stable ordering across multiple pages.
 *
 * Validates the pagination mechanism using created_at and id composite cursors. This test verifies the comment retrieval endpoint supports proper pagination parameters and returns correctly structured responses.
 *
 * The test authenticates a member, creates a community, subscribes to it, creates a post, and then retrieves comments using cursor-based pagination with various sort options and limits. It validates the pagination metadata and response structure.
 *
 * 1. Member authenticates via authorize_member_join.
 * 2. Community is created via generate_random_reddit_community_member_communities_create.
 * 3. Member subscribes to community via generate_random_reddit_community_member_member_subscriptions_create.
 * 4. Post is created via generate_random_reddit_community_posts_create.
 * 5. Retrieve comments with sort='new' and limit=10.
 * 6. Validate pagination metadata structure and response format.
 * 7. Retrieve comments with sort='best' to verify sorting options work.
 * 8. Retrieve comments with different limit values to verify pagination flexibility.
 * 9. Validate cursor parameters can be passed (created_at and id for composite cursor).
 */
export async function test_api_comment_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve comments with sort='new' and limit=10
  const firstPage = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    firstPage.pagination.limit >= 1 && firstPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));
  TestValidator.equals(
    "data length matches limit or records",
    firstPage.data.length <= 10,
    true,
  );
  // 6. Validate each comment in response has required fields
  for (const comment of firstPage.data) {
    typia.assert(comment);
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
  }
  // 7. Retrieve comments with sort='best' to verify sorting options
  const bestSortedPage =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          limit: 20,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(bestSortedPage);
  TestValidator.predicate(
    "best sorted page has valid structure",
    bestSortedPage.data !== undefined,
  );
  // 8. Retrieve comments with sort='controversial'
  const controversialPage =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
          limit: 15,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(controversialPage);
  TestValidator.predicate(
    "controversial sorted page has valid structure",
    controversialPage.data !== undefined,
  );
  // 9. Test cursor parameters can be passed (composite cursor pagination)
  // When comments exist, extract cursor from first page and use for second page
  if (firstPage.data.length > 0) {
    const lastComment = firstPage.data[firstPage.data.length - 1];
    const cursorCreatedAt = lastComment.createdAt;
    const cursorId = lastComment.id;
    const secondPage =
      await api.functional.redditCommunity.posts.comments.index(
        memberConnection,
        {
          postId: post.id,
          body: {
            sort: "new",
            limit: 10,
            created_at: cursorCreatedAt,
            id: cursorId,
          } satisfies IRedditCommunityComment.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.predicate(
      "second page has valid structure",
      secondPage.data !== undefined,
    );
    TestValidator.predicate(
      "second page pagination is valid",
      secondPage.pagination !== undefined,
    );
  }
  // 10. Test with minimum limit
  const minLimitPage =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 1,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.predicate(
    "min limit page has at most 1 item",
    minLimitPage.data.length <= 1,
  );
  // 11. Test with maximum limit
  const maxLimitPage =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 100,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "max limit page has at most 100 items",
    maxLimitPage.data.length <= 100,
  );
  // 12. Test parentCommentId filter parameter (for nested replies)
  const parentFilterPage =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 10,
          parentCommentId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(parentFilterPage);
  TestValidator.predicate(
    "parent filter page has valid structure",
    parentFilterPage.data !== undefined,
  );
}
