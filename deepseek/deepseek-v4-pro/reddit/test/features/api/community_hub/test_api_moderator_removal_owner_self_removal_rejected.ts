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
 * Test that the community owner cannot remove themselves from the moderator list.
 *
 * Validates the governance constraint that a community owner must remain on the
 * moderator roster. The owner holds supreme, permanent authority over the
 * community and cannot self-remove — this protects the community from becoming
 * ownerless. Ownership must be transferred or the community deleted to relinquish
 * authority.
 *
 * 1. Register a new member as the future community owner via authorize_member_join.
 * 2. Owner creates a community, automatically receiving the owner role.
 * 3. Owner attempts to remove themselves via the DELETE moderators endpoint.
 * 4. Expect 422 Unprocessable Entity — owner self-removal is rejected.
 */
export async function test_api_moderator_removal_owner_self_removal_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community, automatically receiving the owner role
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner attempts to remove themselves — expect 422 rejection
  await TestValidator.httpError(
    "owner cannot remove themselves from the moderator list",
    422,
    async () => {
      await api.functional.communityHub.member.communities.moderators.erase(
        ownerConnection,
        {
          communityName: community.name,
          userId: owner.id,
        },
      );
    },
  );
}
