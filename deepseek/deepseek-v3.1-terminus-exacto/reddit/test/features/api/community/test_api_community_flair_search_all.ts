import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlair";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test basic search functionality for community flairs without any filters applied.
 * Verify that the endpoint returns a paginated list of flair summaries including
 * essential information like ID, display text, active status, creation timestamp,
 * and community context. Validate that different pagination parameters work correctly
 * (different page numbers and limits), and ensure the response structure matches
 * the expected schema with proper pagination metadata.
 */
export async function test_api_community_flair_search_all(
  connection: api.IConnection,
): Promise<void> {
  // Setup: User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Setup: Create a test community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // Test: Search flairs without filters using empty request
  const searchResult =
    await api.functional.communityPlatform.communities.flairs.index(
      userConnection,
      {
        communityId: community.id,
        body: {}, // No filters applied - basic search
      },
    );
  // Validate basic response structure
  typia.assert(searchResult);
  TestValidator.equals(
    "response is paginated",
    Array.isArray(searchResult.data),
    true,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    searchResult.pagination !== undefined,
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page property",
    typeof searchResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit property",
    typeof searchResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records property",
    typeof searchResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages property",
    typeof searchResult.pagination.pages,
    "number",
  );
  // Test different page number
  const page2 = await api.functional.communityPlatform.communities.flairs.index(
    userConnection,
    {
      communityId: community.id,
      body: {
        page: 2,
      },
    },
  );
  TestValidator.equals(
    "page 2 has correct page number",
    page2.pagination.current,
    2,
  );
  // Test different page limit
  const limit10 =
    await api.functional.communityPlatform.communities.flairs.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
        },
      },
    );
  TestValidator.equals(
    "limit 10 matches requested limit",
    limit10.pagination.limit,
    10,
  );
  // Validate individual flair properties if data exists
  if (searchResult.data.length > 0) {
    const sampleFlair = searchResult.data[0];
    TestValidator.equals(
      "flair has string id",
      typeof sampleFlair.id,
      "string",
    );
    TestValidator.equals(
      "display text is string",
      typeof sampleFlair.display_text,
      "string",
    );
    TestValidator.predicate(
      "active status is boolean",
      typeof sampleFlair.is_active === "boolean",
    );
    TestValidator.equals(
      "created at is ISO string",
      /^\\d{4}-\\d{2}-\\d{2}T/.test(sampleFlair.created_at),
      true,
    );
    TestValidator.equals(
      "community context exists",
      typeof sampleFlair.community,
      "object",
    );
    TestValidator.equals(
      "community has correct id",
      sampleFlair.community.id,
      community.id,
    );
  }
}
