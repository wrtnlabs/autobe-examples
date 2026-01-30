import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunity";
export async function test_api_trending_communities_cache_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  // First request: Get trending communities
  const firstResponse: IPageICommunityBbsCommunity =
    await api.functional.communityBbs.analytics.communities.trending.index(
      guestConnection,
    );
  typia.assert(firstResponse);
  // Second identical request: Should use cache
  const secondResponse: IPageICommunityBbsCommunity =
    await api.functional.communityBbs.analytics.communities.trending.index(
      guestConnection,
    );
  typia.assert(secondResponse);
  // Validate that cache was hit: responses are identical
  TestValidator.equals(
    "first and second identical requests should return identical responses due to caching",
    firstResponse,
    secondResponse,
  );
}
