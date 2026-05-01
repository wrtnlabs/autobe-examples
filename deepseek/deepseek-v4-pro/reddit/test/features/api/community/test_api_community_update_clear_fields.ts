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
 * Test that community owner can clear description and icon_image by setting them to null.
 *
 * Validates the partial update semantics of the community update endpoint where explicitly setting nullable fields to null clears their values while preserving all other community attributes. This ensures that owners can remove a community's description or icon without affecting its core identity.
 *
 * 1. Owner registers and authenticates via join.
 * 2. Owner creates a community with both description and icon_image populated.
 * 3. Owner updates the community, explicitly setting description and icon_image to null.
 * 4. Validates that description and icon_image are null in the response.
 * 5. Validates that id, name, owner, subscriber_count, and created_at remain unchanged.
 * 6. Validates that updated_at has been refreshed, confirming the update was processed.
 */
export async function test_api_community_update_clear_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community with both description and icon_image
  const iconUri = typia.random<string & tags.Format<"uri">>();
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {
        body: {
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_image: iconUri,
        },
      },
    );
  typia.assert(community);
  // Verify initial state has description and icon set
  TestValidator.predicate(
    "initial description exists",
    community.description !== null,
  );
  TestValidator.predicate("initial icon exists", community.icon_image !== null);
  // 3. Update community to clear both description and icon_image
  const updated = await api.functional.communityHub.member.communities.update(
    ownerConnection,
    {
      communityName: community.name,
      body: {
        description: null,
        icon_image: null,
      } satisfies ICommunityHubCommunity.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate cleared fields
  TestValidator.equals("description cleared", updated.description, null);
  TestValidator.equals("icon_image cleared", updated.icon_image, null);
  // 5. Validate unchanged fields
  TestValidator.equals("id unchanged", updated.id, community.id);
  TestValidator.equals("name unchanged", updated.name, community.name);
  TestValidator.equals("owner unchanged", updated.owner.id, community.owner.id);
  TestValidator.equals(
    "subscriber_count unchanged",
    updated.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    community.created_at,
  );
  // 6. Validate updated_at has been refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    updated.updated_at,
    community.updated_at,
  );
}
