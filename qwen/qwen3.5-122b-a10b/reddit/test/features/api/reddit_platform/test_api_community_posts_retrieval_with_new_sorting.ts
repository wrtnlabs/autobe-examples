import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_posts_retrieval_with_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create a test connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create request with new sorting
  const request: IRedditPlatformPost.IRequest = {
    sort_by: "new",
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformPost.IRequest;
  // Call the API endpoint to retrieve posts sorted by newest first
  const result: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.communities.posts.index(
      adminConnection,
      {
        communityId,
        body: request,
      },
    );
  // Validate response type completely
  typia.assert(result);
  // Validate pagination metadata structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // Validate post summaries if data exists
  if (result.data.length > 0) {
    // Verify each post has valid structure (typia.assert validates all fields)
    for (const post of result.data) {
      typia.assert(post);
    }
    // Verify posts are sorted by created_at descending (newest first)
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].created_at).getTime();
      const next = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `post at index ${i} is newer than or equal to post at index ${i + 1}`,
        current >= next,
      );
    }
    // Verify post_type-specific preview content
    for (const post of result.data) {
      typia.assert(post);
      // Text posts: preview should be first 200 characters of content
      if (post.post_type === "text") {
        TestValidator.predicate(
          "text post preview length",
          post.preview.length <= 200,
        );
      }
      // Link posts: preview should contain domain name (contains ".")
      if (post.post_type === "link") {
        TestValidator.predicate(
          "link post preview contains domain",
          post.preview.includes("."),
        );
      }
      // Image posts: preview should be a URI (contains "://")
      if (post.post_type === "image") {
        TestValidator.predicate(
          "image post preview is URI",
          post.preview.includes("://") || post.preview.startsWith("/"),
        );
      }
    }
  }
  // Verify empty result structure when no posts exist
  TestValidator.equals(
    "pagination pages matches records",
    result.pagination.pages,
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit),
  );
}
