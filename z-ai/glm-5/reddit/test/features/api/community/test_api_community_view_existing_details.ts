import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test successful retrieval of community details for an existing, active community.
 *
 * This test verifies that:
 * 1. A member can create a community
 * 2. Any user (authenticated or not) can retrieve community details by name
 * 3. The response contains all expected fields with correct values
 * 4. Owner information matches the community creator
 * 5. Subscriber count reflects the creator's auto-subscription
 */
export async function test_api_community_view_existing_details(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account to become the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {},
  );
  typia.assert(owner);
  // Step 2: Create a new community with unique name and description
  const community: ICommunityCommunity =
    await generate_random_community_member_communities_create(ownerConnection, {
      body: {
        name: `test_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityCommunity.ICreate,
    });
  typia.assert(community);
  // Step 3: Retrieve community details using the public endpoint
  // Note: This is a public endpoint - no authentication required
  const retrievedCommunity: ICommunityCommunity =
    await api.functional.community.communities.at(connection, {
      communityName: community.name,
    });
  typia.assert(retrievedCommunity);
  // Step 4: Validate all expected fields
  // Validate id matches the created community
  TestValidator.equals("id matches", retrievedCommunity.id, community.id);
  // Validate name matches the created community
  TestValidator.equals("name matches", retrievedCommunity.name, community.name);
  // Validate description matches
  TestValidator.equals(
    "description matches",
    retrievedCommunity.description,
    community.description,
  );
  // Validate iconUrl matches
  TestValidator.equals(
    "iconUrl matches",
    retrievedCommunity.iconUrl,
    community.iconUrl,
  );
  // Validate subscriber count (creator is auto-subscribed, so should be at least 1)
  TestValidator.predicate(
    "subscriber count is at least 1",
    retrievedCommunity.subscriberCount >= 1,
  );
  // Validate deletedAt is null (active community)
  TestValidator.equals("deletedAt is null", retrievedCommunity.deletedAt, null);
  // Step 5: Validate owner information matches the member who created the community
  TestValidator.equals(
    "owner id matches",
    retrievedCommunity.owner.id,
    owner.id,
  );
  TestValidator.equals(
    "owner username matches",
    retrievedCommunity.owner.username,
    owner.username,
  );
  TestValidator.equals(
    "owner displayName matches",
    retrievedCommunity.owner.displayName,
    owner.display_name ?? null,
  );
  TestValidator.equals(
    "owner avatarUrl matches",
    retrievedCommunity.owner.avatarUrl,
    owner.avatar_url ?? null,
  );
  TestValidator.equals(
    "owner karma matches",
    retrievedCommunity.owner.karma,
    owner.karma,
  );
}
