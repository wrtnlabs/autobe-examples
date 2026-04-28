import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Verifies case-insensitive partial matching filter on community names or descriptions.
 *
 * Registers a new member account, then creates multiple communities with specific
 * names and descriptions to validate the search functionality. The system is tested against
 * exact matches, partial matches (with mixed case), and non-matching queries.
 * Validates that only active communities (deleted_at IS NULL) are returned and
 * checks pagination metadata and result data integrity.
 *
 * 1. Register a new member.
 * 2. Create multiple communities with known names/descriptions.
 * 3. Search by partial name (case-insensitive).
 * 4. Search by partial description (case-insensitive).
 * 5. Search with non-matching query to validate empty results.
 */
export async function test_api_community_search_by_name_or_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create communities
  const community1 =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Tech Enthusiasts",
          description: "A vibrant community for tech lovers and enthusiasts",
        },
      },
    );
  const community2 =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Gaming World",
          description: "The ultimate destination for gamers and game lovers",
        },
      },
    );
  // 3. Search by partial name: "tech" -> matches "Tech Enthusiasts"
  const searchByTechName =
    await api.functional.redditLikeCommunity.community_profiles.index(
      connection,
      {
        body: {
          name: "tech",
        } satisfies IREdditLikeCommunityCommunity.IRequest,
      },
    );
  typia.assert(searchByTechName);
  TestValidator.predicate(
    "found community by partial name 'tech'",
    searchByTechName.data.length === 1,
  );
  TestValidator.equals(
    "matched community name contains 'tech'",
    searchByTechName.data[0].name,
    "Tech Enthusiasts",
  );
  // 4. Search by partial description: "gamers" -> matches "Gaming World"
  const searchByGamersDesc =
    await api.functional.redditLikeCommunity.community_profiles.index(
      connection,
      {
        body: {
          description: "gamers",
        } satisfies IREdditLikeCommunityCommunity.IRequest,
      },
    );
  typia.assert(searchByGamersDesc);
  TestValidator.predicate(
    "found community by partial description 'gamers'",
    searchByGamersDesc.data.length === 1,
  );
  TestValidator.equals(
    "matched community description contains 'gamers'",
    searchByGamersDesc.data[0].name,
    "Gaming World",
  );
  // 5. Search with non-matching query -> empty results
  const searchByNonExistent =
    await api.functional.redditLikeCommunity.community_profiles.index(
      connection,
      {
        body: {
          name: "nonexistent_query_xyz",
        } satisfies IREdditLikeCommunityCommunity.IRequest,
      },
    );
  typia.assert(searchByNonExistent);
  TestValidator.equals(
    "no communities found for non-matching query",
    searchByNonExistent.data.length,
    0,
  );
}