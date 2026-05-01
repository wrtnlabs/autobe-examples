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
 * Test retrieving a community by its exact name returns the complete public profile.
 *
 * Validates the primary success path for the community detail view endpoint. A new member registers and creates a community with a unique name and description, then the community is retrieved by that exact name. All ICommunityHubCommunity fields are validated including the id (UUID v4), name, description, icon_image (null), subscriber_count (0), owner identity, created_at, and updated_at (equal to created_at for a newly created community).
 *
 * Special attention is given to verifying the owner relationship — the owner's username, display name, and id must match the member who created the community, confirming correct ownership attribution.
 *
 * 1. Register a new member via authorize_member_join to obtain authentication.
 * 2. Create a community with a random unique name and description using the authenticated member connection.
 * 3. Retrieve the community by exact name via the public communities.at endpoint.
 * 4. Validate all fields match the created community and owner identity is correct.
 */
export async function test_api_community_view_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new community with specific name and description
  const communityName = RandomGenerator.alphabets(8);
  const communityDescription = RandomGenerator.paragraph({ sentences: 2 });
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        },
      },
    );
  typia.assert(community);
  // 3. Retrieve the community by exact name
  const guestConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.communityHub.communities.at(
    guestConnection,
    {
      communityName: community.name,
    },
  );
  typia.assert(retrieved);
  // 4. Validate all ICommunityHubCommunity fields
  TestValidator.equals("community id matches", retrieved.id, community.id);
  TestValidator.equals("community name matches", retrieved.name, communityName);
  TestValidator.equals(
    "community description matches",
    retrieved.description,
    communityDescription,
  );
  TestValidator.equals("icon image is null", retrieved.icon_image, null);
  TestValidator.equals("subscriber count is 0", retrieved.subscriber_count, 0);
  TestValidator.equals(
    "owner username matches creator",
    retrieved.owner.username,
    member.username,
  );
  TestValidator.equals(
    "owner display name matches",
    retrieved.owner.display_name,
    member.display_name,
  );
  TestValidator.equals("owner id matches", retrieved.owner.id, member.id);
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "updated_at matches created_at",
    retrieved.updated_at,
    retrieved.created_at,
  );
}
