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
export async function test_api_post_controversial_feed_default(
  connection: api.IConnection,
): Promise<void> {
  // Create a community code using a valid format
  const communityCode =
    "com" + typia.random<string & tags.Format<"uuid">>().substring(0, 24);
  // Create request parameters for controversial feed with explicit type assertion
  const requestBody: ICommunityPlatformPost.IRequest = {
    sort: "controversial",
    page: 1, // Default value according to schema
    limit: 20, // Default value according to schema
  };
  // Call the controversial feed endpoint
  const response: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.controversial.index(
      connection,
      {
        communityCode,
        body: requestBody,
      },
    );
  // Validate the response structure with perfect type verification
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1 (default)",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 (default)",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    () => response.pagination.pages >= 0,
  );
  // Validate that posts array is not empty (controversial feed should have results)
  TestValidator.predicate(
    "posts array is not empty",
    () => response.data.length > 0,
  );
  // Validate each post summary
  for (const post of response.data) {
    // Ensure the post has the required structure
    TestValidator.equals("post has valid UUID id", typeof post.id, "string");
    // Ensure author is empty object as defined in DTO
    TestValidator.equals("author is empty object", post.author, {});
    // Validate community has required properties
    TestValidator.predicate(
      "community name exists and is non-empty",
      () => post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community description is not longer than 1000 characters",
      () => post.community.description.length <= 1000,
    );
    TestValidator.predicate("community icon is a valid URI", () => {
      try {
        new URL(post.community.icon);
        return true;
      } catch {
        return false;
      }
    });
    TestValidator.predicate(
      "community subscriber count is non-negative",
      () => post.community.subscriber_count >= 0,
    );
    TestValidator.predicate("community created_at is valid date-time", () => {
      const date = new Date(post.community.created_at);
      return !isNaN(date.getTime());
    });
    // Validate vote score within reasonable bounds
    TestValidator.predicate("vote score is within reasonable range", () => {
      return post.voteScore >= -1000 && post.voteScore <= 1000;
    });
    // Validate comment count is non-negative
    TestValidator.predicate(
      "comment count is non-negative",
      () => post.commentCount >= 0,
    );
    // Validate creation time is valid
    TestValidator.predicate("created_at is valid date-time", () => {
      const date = new Date(post.createdAt);
      return !isNaN(date.getTime());
    });
  }
}
