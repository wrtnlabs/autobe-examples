import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_posts_trending_authorization_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // Note: The trending endpoint is accessible to all users (authorization-type: null)
  // so authentication testing is not applicable for this endpoint.
  // Test that the endpoint returns valid data structure
  const trendingPosts =
    await api.functional.communityPlatform.moderator.posts.trending(connection);
  typia.assert(trendingPosts);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure exists",
    trendingPosts.pagination !== undefined,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(trendingPosts.data),
    true,
  );
  // Note: Without the ability to create posts (no post creation endpoints available),
  // we cannot test the deleted post filtering scenario as described in the requirements.
  // The test focuses on validating the response structure with the available data.
  // If posts are returned, validate their structure meets the expected format
  if (trendingPosts.data.length > 0) {
    const samplePost = trendingPosts.data[0];
    // The typia.assert above already validates all properties, so we only need to
    // test business logic aspects if they exist in the actual implementation
    // Test that active posts (deleted_at === null) are properly structured
    if (samplePost.deleted_at === null) {
      TestValidator.predicate(
        "active post has valid author",
        samplePost.author !== undefined &&
          typeof samplePost.author.id === "string",
      );
      TestValidator.predicate(
        "active post has valid community",
        samplePost.community !== undefined &&
          typeof samplePost.community.id === "string",
      );
    }
  }
  // TestValidator calls for pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    trendingPosts.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    trendingPosts.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    trendingPosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    trendingPosts.pagination.pages >= 0,
  );
}
