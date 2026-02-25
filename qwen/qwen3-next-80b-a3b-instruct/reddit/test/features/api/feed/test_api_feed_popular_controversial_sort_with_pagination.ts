import api from "@ORGANIZATION/PROJECT-api";
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

export async function test_api_feed_popular_controversial_sort_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for anonymous guest user (no auth needed)
  const guestConnection: api.IConnection = { host: connection.host };
  // Request the popular feed with controversial sorting and pagination
  const requestBody: IRedditCommunityPost.IRequest = {
    sort: "controversial",
    page: 3,
    limit: 25,
  };
  const response = await api.functional.redditCommunity.feeds.popular.index(
    guestConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "response is IPageIRedditCommunityPost.ISummary",
    response.pagination.current,
    3,
  );
  TestValidator.equals("response has limit", response.pagination.limit, 25);
  TestValidator.predicate(
    "response has at least 25 records",
    () => response.pagination.records >= 25,
  );
  TestValidator.predicate(
    "response has at least 3 pages",
    () => response.pagination.pages >= 3,
  );
  TestValidator.equals(
    "response data contains exactly 25 items",
    response.data.length,
    25,
  );
  // Validate each item in data is IRedditCommunityPost.ISummary
  TestValidator.predicate(
    "all data items are valid IRedditCommunityPost.ISummary",
    () => {
      return response.data.every(
        (post) =>
          typeof post.id === "string" &&
          post.id.length === 36 && // UUID length
          typeof post.title === "string" &&
          typeof post.author === "object" &&
          post.author !== null &&
          typeof post.author.id === "string" &&
          typeof post.author.username === "string" &&
          typeof post.author.display_name === "string" &&
          typeof post.author.karma_score === "number" &&
          typeof post.author.created_at === "string" &&
          typeof post.community === "object" &&
          post.community !== null &&
          typeof post.community.id === "string" &&
          typeof post.community.name === "string" &&
          typeof post.community.description === "string" &&
          typeof post.community.subscriber_count === "number" &&
          typeof post.community.created_at === "string" &&
          typeof post.community.updated_at === "string" &&
          typeof post.voteScore === "number" &&
          typeof post.commentCount === "number" &&
          typeof post.createdAt === "string" &&
          typeof post.updatedAt === "string" &&
          (post.url === null ||
            post.url === undefined ||
            typeof post.url === "string") &&
          (post.imageUrl === null ||
            post.imageUrl === undefined ||
            typeof post.imageUrl === "string"),
      );
    },
  );
}
