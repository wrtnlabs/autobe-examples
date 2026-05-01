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
 * Test that a community owner can update their community's description and icon image.
 *
 * Validates the complete community update workflow: owner authentication, community creation, attribute updates, and response validation. Ensures that the update endpoint correctly applies changes to mutable fields (description, icon_image) while preserving immutable fields (name, owner, subscriber_count, created_at) and updating the updated_at timestamp to reflect the modification time.
 *
 * 1. Owner authenticates via member join.
 * 2. Owner creates a new community.
 * 3. Owner updates the community's description and icon_image to new values.
 * 4. Validates that description and icon_image reflect the new values.
 * 5. Validates that name, owner, subscriber_count, and created_at remain unchanged.
 * 6. Validates that updated_at has changed from its original value.
 */
export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Prepare update data
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newIconUri = typia.random<string & tags.Format<"uri">>();
  // 4. Update community
  const updated = await api.functional.communityHub.member.communities.update(
    ownerConnection,
    {
      communityName: community.name,
      body: {
        description: newDescription,
        icon_image: newIconUri,
      } satisfies ICommunityHubCommunity.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate updated fields
  TestValidator.equals(
    "description updated",
    updated.description,
    newDescription,
  );
  TestValidator.equals("icon_image updated", updated.icon_image, newIconUri);
  // 6. Validate immutable fields
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
  // 7. Validate updated_at reflects the modification
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    community.updated_at,
  );
}
