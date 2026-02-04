import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_popular_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection for popular feed access
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random test data for post sorting
  const requestData: ICommunityPlatformPost.IRequest = {
    sort: "hot",
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformPost.IRequest;
  // Call the popular feed API with hot sorting
  const response: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.popular.index(
      guestConnection,
      { body: requestData },
    );
  // Validate response structure with typia.assert
  typia.assert(response);
  // Validate pagination information
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is positive",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    response.pagination.pages >= 0,
  );
  // Validate that response contains posts
  TestValidator.predicate("response has posts", response.data.length > 0);
  // Validate each post summary structure
  for (const post of response.data) {
    // Validate required post properties
    TestValidator.equals("post id is UUID", typeof post.id, "string");
    TestValidator.predicate(
      "post id matches UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        post.id,
      ),
    );
    // Validate author
    TestValidator.equals("author is object", typeof post.author, "object");
    TestValidator.equals(
      "author has no properties",
      Object.keys(post.author).length,
      0,
    );
    // Validate community
    TestValidator.equals(
      "community is object",
      typeof post.community,
      "object",
    );
    TestValidator.predicate(
      "community name exists",
      typeof post.community.name === "string",
    );
    TestValidator.predicate(
      "community name has length",
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community description exists",
      typeof post.community.description === "string",
    );
    TestValidator.predicate(
      "community description has length",
      post.community.description.length > 0,
    );
    TestValidator.predicate(
      "community icon is URI",
      typeof post.community.icon === "string",
    );
    TestValidator.predicate(
      "community icon is valid URI",
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(post.community.icon),
    );
    TestValidator.predicate(
      "community subscriber count is non-negative",
      post.community.subscriber_count >= 0,
    );
    TestValidator.equals(
      "community created_at is ISO date-time",
      typeof post.community.created_at,
      "string",
    );
    // Validate post metadata
    TestValidator.predicate(
      "post voteScore is number",
      typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "post commentCount is number",
      typeof post.commentCount === "number",
    );
    TestValidator.predicate(
      "post commentCount is non-negative",
      post.commentCount >= 0,
    );
    TestValidator.equals(
      "post createdAt is ISO date-time",
      typeof post.createdAt,
      "string",
    );
  }
}
