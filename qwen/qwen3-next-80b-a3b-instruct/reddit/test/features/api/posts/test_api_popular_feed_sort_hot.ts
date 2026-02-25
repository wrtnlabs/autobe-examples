import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_sort_hot(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Call the popular feed endpoint with hot sorting and all time filter
  const popularFeed =
    await api.functional.redditCommunity.analytics.posts.popular.index(
      memberConnection,
      {
        body: {
          sort: "hot",
          timeFilter: "all",
          page: 1,
          limit: 25,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(popularFeed);
  // Verify pagination structure
  TestValidator.equals(
    "pagination current page",
    popularFeed.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", popularFeed.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records is non-negative",
    popularFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    popularFeed.pagination.pages >= 0,
  );
  // Verify data structure
  TestValidator.predicate("data array exists", Array.isArray(popularFeed.data));
  TestValidator.predicate(
    "at least one post exists in data",
    popularFeed.data.length >= 0,
  );
  // Verify post summary structure
  if (popularFeed.data.length > 0) {
    const firstPost = popularFeed.data[0];
    TestValidator.equals(
      "post has valid id format",
      typeof firstPost.id,
      "string",
    );
    TestValidator.equals(
      "post has valid title",
      typeof firstPost.title,
      "string",
    );
    TestValidator.equals(
      "post has valid author",
      typeof firstPost.author,
      "object",
    );
    TestValidator.equals(
      "post has valid community",
      typeof firstPost.community,
      "object",
    );
    TestValidator.equals(
      "post has valid voteScore",
      typeof firstPost.voteScore,
      "number",
    );
    TestValidator.equals(
      "post has valid commentCount",
      typeof firstPost.commentCount,
      "number",
    );
    TestValidator.equals(
      "post has valid createdAt",
      typeof firstPost.createdAt,
      "string",
    );
    TestValidator.equals(
      "post has valid updatedAt",
      typeof firstPost.updatedAt,
      "string",
    );
    // Verified author structure
    const author = firstPost.author;
    TestValidator.equals("author has valid id", typeof author.id, "string");
    TestValidator.equals(
      "author has valid username",
      typeof author.username,
      "string",
    );
    TestValidator.equals(
      "author has valid display_name",
      typeof author.display_name,
      "string",
    );
    TestValidator.predicate(
      "author has valid karma_score",
      typeof author.karma_score === "number",
    );
    TestValidator.equals(
      "author has valid created_at",
      typeof author.created_at,
      "string",
    );
    // Verified community structure
    const community = firstPost.community;
    TestValidator.equals(
      "community has valid id",
      typeof community.id,
      "string",
    );
    TestValidator.equals(
      "community has valid name",
      typeof community.name,
      "string",
    );
    TestValidator.equals(
      "community has valid description",
      typeof community.description,
      "string",
    );
    TestValidator.equals(
      "community has valid subscriber_count",
      typeof community.subscriber_count,
      "number",
    );
    TestValidator.equals(
      "community has valid created_at",
      typeof community.created_at,
      "string",
    );
    TestValidator.equals(
      "community has valid updated_at",
      typeof community.updated_at,
      "string",
    );
  }
}
