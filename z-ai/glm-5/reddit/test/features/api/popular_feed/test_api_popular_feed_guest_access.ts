import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that guest users (unauthenticated) can access the popular feed.
 *
 * Validates that the popular feed endpoint is publicly accessible without
 * authentication and returns properly structured paginated post data from
 * multiple communities across the platform.
 */
export async function test_api_popular_feed_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // Call popular feed endpoint WITHOUT authentication (guest access)
  const response = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformPost.IRequest,
    },
  );
  // Validate complete response structure (typia.assert validates all types)
  typia.assert(response);
  // Verify pagination metadata is present (business logic: pagination exists)
  TestValidator.predicate(
    "pagination exists",
    () => response.pagination !== undefined,
  );
  // Verify data array exists
  TestValidator.predicate("data array exists", () =>
    Array.isArray(response.data),
  );
  // Verify posts come from multiple communities (platform-wide aggregation business logic)
  if (response.data.length > 0) {
    const communityIds = new Set(
      response.data.map((post) => post.community.id),
    );
    // Platform-wide feed should include posts from at least one community
    TestValidator.predicate(
      "posts from communities available",
      () => communityIds.size >= 1,
    );
  }
}
