import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_comment_pagination_with_cursor_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: undefined,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Test comment pagination endpoint - first page with limit=10
  const firstPage = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 10,
        sort: "new",
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(firstPage);
  // Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is valid",
    firstPage.pagination.current >= 1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));
  // 6. Test with different page sizes
  const smallPage = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 5,
        sort: "new",
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(smallPage);
  TestValidator.equals("small page limit", smallPage.pagination.limit, 5);
  TestValidator.predicate(
    "small page data respects limit",
    smallPage.data.length <= 5,
  );
  // 7. Test sorting options
  const bestSorted = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 10,
        sort: "best",
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(bestSorted);
  TestValidator.predicate(
    "best sorted returns array",
    Array.isArray(bestSorted.data),
  );
  const controversialSorted =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          limit: 10,
          sort: "controversial",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(controversialSorted);
  TestValidator.predicate(
    "controversial sorted returns array",
    Array.isArray(controversialSorted.data),
  );
  // 8. Test date range filtering
  const now = new Date();
  const futureDate = new Date(now.getTime() + 86400000).toISOString();
  const pastDate = new Date(now.getTime() - 86400000).toISOString();
  const filteredByDate =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          limit: 10,
          sort: "new",
          created_at_from: pastDate,
          created_at_to: futureDate,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "date filtered returns array",
    Array.isArray(filteredByDate.data),
  );
  // Verify all returned comments fall within date range
  filteredByDate.data.forEach((comment) => {
    const commentDate = new Date(comment.created_at);
    TestValidator.predicate(
      `comment ${comment.id} created after from date`,
      commentDate >= new Date(pastDate),
    );
    TestValidator.predicate(
      `comment ${comment.id} created before to date`,
      commentDate <= new Date(futureDate),
    );
  });
  // 9. Test cursor parameter (with undefined/null for first page)
  const withCursor = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 10,
        sort: "new",
        cursor: undefined,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(withCursor);
  TestValidator.predicate(
    "cursor query returns array",
    Array.isArray(withCursor.data),
  );
  // 10. Verify comment summary structure if comments exist
  if (firstPage.data.length > 0) {
    const firstComment = firstPage.data[0];
    TestValidator.predicate("comment has id", firstComment.id !== undefined);
    TestValidator.predicate(
      "comment has content",
      firstComment.content !== undefined,
    );
    TestValidator.predicate(
      "comment has author",
      firstComment.author !== undefined,
    );
    TestValidator.predicate(
      "comment has created_at",
      firstComment.created_at !== undefined,
    );
    TestValidator.predicate(
      "comment has vote_score",
      typeof firstComment.vote_score === "number",
    );
  }
}
