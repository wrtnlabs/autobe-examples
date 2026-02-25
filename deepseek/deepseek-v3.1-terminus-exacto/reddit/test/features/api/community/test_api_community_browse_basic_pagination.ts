import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browse_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test basic community browsing with default pagination parameters
  const response =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          // Use default parameters: no search, no sorting, default page/limit
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination calculations (business logic)
  TestValidator.predicate(
    "total pages calculation",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  // Validate each community summary structure
  for (const community of response.data) {
    typia.assert(community);
    // Validate icon_url format when present (business logic validation)
    if (community.icon_url !== null) {
      TestValidator.predicate(
        "icon_url starts with http or slash",
        community.icon_url.startsWith("http") ||
          community.icon_url.startsWith("/"),
      );
    }
  }
}
