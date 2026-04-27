import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test searching for communities by name with partial, exact, and non-matching queries.
 *
 * Verifies that the community browse endpoint supports case-insensitive substring matching
 * against community names. Tests include partial match (substring), exact match, no-match
 * (empty results with valid pagination), and case-insensitive matching.
 *
 * A member creates two communities with distinct names, then various search queries are
 * executed against the publicly accessible PATCH /communityPlatform/communities endpoint.
 * The non-matching query is validated to return an empty data array with valid pagination
 * metadata rather than an error response.
 *
 * 1. Register a member via POST /communityPlatform/auth/member/join.
 * 2. Create two communities with known names using POST /communityPlatform/member/communities.
 * 3. Search with a partial name substring ("tech") — verify "Technology" appears.
 * 4. Search with the exact name ("Technology") — verify the community appears.
 * 5. Search with a non-matching query ("zzzznotfound") — verify empty data with pagination.
 * 6. Search with uppercase variant ("TECHNOLOGY") — verify case-insensitive match.
 */
export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member for creating communities
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create two communities with distinct known names
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Technology",
        },
      },
    );
  typia.assert(community);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "ArtAndDesign",
        },
      },
    );
  typia.assert(community2);
  // 3. Search with partial name substring — should find "Technology"
  const anonConnection: api.IConnection = { host: connection.host };
  const partialResult =
    await api.functional.communityPlatform.communities.index(anonConnection, {
      body: {
        search: "tech",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(partialResult);
  TestValidator.predicate(
    "partial name search 'tech' should find Technology community",
    () => partialResult.data.some((c) => c.name === "Technology"),
  );
  // 4. Search with exact name — should find "Technology"
  const exactResult = await api.functional.communityPlatform.communities.index(
    anonConnection,
    {
      body: {
        search: "Technology",
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(exactResult);
  TestValidator.predicate(
    "exact name search 'Technology' should find the community",
    () => exactResult.data.some((c) => c.name === "Technology"),
  );
  // 5. Search with non-matching query — should return empty data, not error
  const noMatchResult =
    await api.functional.communityPlatform.communities.index(anonConnection, {
      body: {
        search: "zzzznotfound",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(noMatchResult);
  TestValidator.equals(
    "non-matching search returns empty data array",
    noMatchResult.data,
    [],
  );
  TestValidator.predicate(
    "non-matching search has zero total records",
    () => noMatchResult.pagination.records === 0,
  );
  // 6. Search with uppercase variant — verify case-insensitive matching
  const caseInsensitiveResult =
    await api.functional.communityPlatform.communities.index(anonConnection, {
      body: {
        search: "TECHNOLOGY",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "case-insensitive search 'TECHNOLOGY' should find Technology community",
    () => caseInsensitiveResult.data.some((c) => c.name === "Technology"),
  );
}
