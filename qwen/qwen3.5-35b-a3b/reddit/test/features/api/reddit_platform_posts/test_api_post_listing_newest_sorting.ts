import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_listing_newest_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch posts with 'new' sorting (most recent first)
  // This endpoint doesn't require authentication
  const response = await api.functional.redditPlatform.posts.index(connection, {
    body: {
      sortBy: "new" as const,
      sortDirection: "desc" as const,
    },
  });
  typia.assert(response);
  // 2. Validate structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 3. Validate sorting: most recent first
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentPost = response.data[i];
    const nextPost = response.data[i + 1];
    TestValidator.predicate(
      "posts sorted by created_at descending",
      currentPost.created_at >= nextPost.created_at,
    );
  }
  // 4. Validate post structure
  if (response.data.length > 0) {
    const firstPost = response.data[0];
    typia.assert(firstPost);
    // Validate required fields
    TestValidator.predicate("has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "has valid post type",
      ["TEXT", "LINK", "IMAGE"].includes(firstPost.post_type),
    );
    TestValidator.predicate(
      "has valid vote_score",
      typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "has valid comment_count",
      typeof firstPost.comment_count === "number",
    );
    TestValidator.predicate(
      "has author",
      firstPost.author !== null && firstPost.author !== undefined,
    );
    TestValidator.predicate(
      "has community",
      firstPost.community !== null && firstPost.community !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      typeof firstPost.created_at === "string",
    );
    // Validate author structure
    typia.assert(firstPost.author);
    TestValidator.equals(
      "author has username",
      typeof firstPost.author.username,
      "string",
    );
    TestValidator.equals(
      "author has display_name",
      typeof firstPost.author.display_name,
      "string",
    );
    TestValidator.equals(
      "author has karma_score",
      typeof firstPost.author.karma_score,
      "number",
    );
    TestValidator.equals(
      "author has is_active",
      typeof firstPost.author.is_active,
      "boolean",
    );
    // Validate community structure
    typia.assert(firstPost.community);
    TestValidator.equals(
      "community has name",
      typeof firstPost.community.name,
      "string",
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof firstPost.community.subscriber_count,
      "number",
    );
    TestValidator.predicate(
      "community has owner",
      firstPost.community.owner !== null &&
        firstPost.community.owner !== undefined,
    );
  }
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page is valid",
    response.pagination.current >= 1,
    true,
  );
  TestValidator.equals("limit is valid", response.pagination.limit > 0, true);
  TestValidator.equals(
    "records count is valid",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is valid",
    response.pagination.pages >= 0,
    true,
  );
  // 6. Verify pagination calculation
  const expectedPages =
    response.pagination.records > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0;
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // 7. Verify data count matches limit for current page
  if (response.pagination.records > 0) {
    const expectedDataLength = Math.min(
      response.pagination.limit,
      response.pagination.records,
    );
    TestValidator.equals(
      "data length matches expected",
      response.data.length,
      expectedDataLength,
    );
  } else {
    TestValidator.equals(
      "data is empty when no records",
      response.data.length,
      0,
    );
  }
}
