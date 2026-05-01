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
 * Test that creating a community with a duplicate name is rejected.
 *
 * Validates the case-insensitive name uniqueness enforcement for community
 * creation endpoints. Community names serve as the primary means of discovery
 * and must be unique across the platform regardless of letter casing.
 *
 * The test first creates a baseline community with the name "TechTalks", then
 * attempts to create another community using the same name in different casing
 * ("techtalks"). The second request must be rejected with HTTP 409 Conflict,
 * confirming that the uniqueness check ignores case differences.
 *
 * 1. Register a new member and obtain authentication credentials.
 * 2. Create a community with the name "TechTalks".
 * 3. Attempt to create another community with the name "techtalks".
 * 4. Verify the duplicate creation is rejected with HTTP 409 Conflict.
 */
export async function test_api_community_create_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create the first community with a specific name
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: { name: "TechTalks" } },
    );
  typia.assert(community);
  // 3. Attempt to create a duplicate community with different casing
  await TestValidator.httpError("duplicate community name", 409, async () => {
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: { name: "techtalks" } },
    );
  });
}
