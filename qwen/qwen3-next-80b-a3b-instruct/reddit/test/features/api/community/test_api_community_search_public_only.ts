import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_public_only(
  connection: api.IConnection,
) {
  // Test that the community search endpoint returns only public communities when unauthenticated
  // We cannot create test communities because the /auth/admin/join endpoint needed for authentication
  // does not exist in the provided API functions. Instead, we test the search functionality on existing data.

  // Search for communities as unauthenticated user
  const searchResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchResponse);

  // Validate that all returned communities are public
  // For unauthenticated users, the platform should only return communities with is_public: true
  const publicCommunities = searchResponse.data.filter(
    (community) => community.is_public === true,
  );
  const privateCommunities = searchResponse.data.filter(
    (community) => community.is_public === false,
  );

  TestValidator.equals(
    "all returned communities are public",
    privateCommunities.length,
    0,
  );
  TestValidator.predicate(
    "at least one public community is returned",
    publicCommunities.length > 0,
  );
}
