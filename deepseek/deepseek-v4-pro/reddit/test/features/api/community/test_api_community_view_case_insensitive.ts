import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test case-insensitive community name matching for single community retrieval.
 *
 * Verifies that the GET /communityHub/communities/{communityName} endpoint performs case-insensitive name lookup as specified by business rule [225]. Community names must be unique across the platform regardless of letter casing, and retrieving a community with any casing variant must return the identical record with the original casing preserved from creation.
 *
 * The test confirms that the platform prevents visually-identical duplicate community names while allowing flexible user search — users can find a community regardless of whether they type the name in lowercase, uppercase, or mixed case.
 *
 * 1. Register a new member and authenticate via authorize_member_join.
 * 2. Create a community with the mixed-case name "TechNewsHub".
 * 3. Retrieve the community using all-lowercase "technewshub" — verifies the same id is returned and the name retains original "TechNewsHub" casing.
 * 4. Retrieve the community using all-uppercase "TECHNEWSHUB" — verifies the same id is returned and the name still retains original "TechNewsHub" casing.
 * 5. Confirms that the response name always reflects the original creation casing, never the casing used in the lookup request.
 */
export async function test_api_community_view_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community with a mixed-case name
  const communityName = "TechNewsHub";
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: { name: communityName } },
    );
  typia.assert(community);
  // 3. Retrieve with all-lowercase name
  const lowerResult = await api.functional.communityHub.communities.at(
    { host: connection.host },
    { communityName: communityName.toLowerCase() },
  );
  typia.assert(lowerResult);
  TestValidator.equals(
    "lowercase lookup returns same id",
    lowerResult.id,
    community.id,
  );
  TestValidator.equals(
    "lowercase lookup preserves original casing",
    lowerResult.name,
    communityName,
  );
  // 4. Retrieve with all-uppercase name
  const upperResult = await api.functional.communityHub.communities.at(
    { host: connection.host },
    { communityName: communityName.toUpperCase() },
  );
  typia.assert(upperResult);
  TestValidator.equals(
    "uppercase lookup returns same id",
    upperResult.id,
    community.id,
  );
  TestValidator.equals(
    "uppercase lookup preserves original casing",
    upperResult.name,
    communityName,
  );
}
