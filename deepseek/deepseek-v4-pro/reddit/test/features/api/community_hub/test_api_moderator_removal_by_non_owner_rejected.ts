import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
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
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";

/**
 * Test that a non-owner member cannot remove a moderator from a community.
 *
 * Validates the governance hierarchy where only the community owner holds the
 * exclusive authority to remove moderators. A regular member who is neither
 * the owner nor a moderator should receive a 403 Forbidden response when
 * attempting to remove any moderator from the community.
 *
 * 1. Community owner registers and creates a community.
 * 2. A moderator member registers and is appointed by the owner.
 * 3. A third non-owner member registers.
 * 4. Non-owner attempts to remove the moderator — rejected with 403.
 */
export async function test_api_moderator_removal_by_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  // 2. Register the member who will become moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(
    moderatorConnection,
    {},
  );
  // 3. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner appoints the moderator
  const moderatorRole =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: moderatorAuthorized.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorRole);
  // 5. Register a third non-owner member
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonOwnerConnection, {});
  // 6. Non-owner attempts to remove the moderator — expect 403
  await TestValidator.httpError(
    "non-owner cannot remove moderator from community",
    403,
    async () => {
      await api.functional.communityHub.member.communities.moderators.erase(
        nonOwnerConnection,
        {
          communityName: community.name,
          userId: moderatorAuthorized.id,
        },
      );
    },
  );
}
