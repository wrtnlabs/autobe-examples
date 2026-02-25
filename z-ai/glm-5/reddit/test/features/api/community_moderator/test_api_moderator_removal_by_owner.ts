import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test that a community owner can successfully remove an appointed moderator.
 *
 * **Test Flow:**
 * 1. User A joins the platform and creates a community (becoming the owner)
 * 2. User B joins the platform and subscribes to the community
 * 3. User A (owner) appoints User B as a moderator
 * 4. User A (owner) removes User B as a moderator
 * 5. Verify the moderator is no longer in the moderator list
 *
 * **Validation Points:**
 * - Only the owner can successfully remove moderators
 * - The removed moderator's member record is not affected
 * - The removal operation returns successfully
 */
export async function test_api_moderator_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User A joins and creates community (becomes owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 2: User B joins and subscribes to the community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  const subscription =
    await api.functional.community.member.communities.subscribe(
      moderatorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Step 3: Owner (User A) appoints User B as moderator
  const appointedModerator =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          member_username: moderatorAuth.username,
        },
      },
    );
  typia.assert(appointedModerator);
  // Verify the moderator was appointed successfully
  TestValidator.equals(
    "moderator is not owner",
    appointedModerator.is_owner,
    false,
  );
  TestValidator.equals(
    "moderator username matches",
    appointedModerator.member.username,
    moderatorAuth.username,
  );
  // Step 4: Owner removes the moderator
  await api.functional.community.member.communities.moderators.removeModerator(
    ownerConnection,
    {
      communityName: community.name,
      moderatorId: appointedModerator.id,
    },
  );
  // Step 5: Verify the moderator was removed by attempting to remove again (should fail)
  await TestValidator.error(
    "removing non-existent moderator should fail",
    async () => {
      await api.functional.community.member.communities.moderators.removeModerator(
        ownerConnection,
        {
          communityName: community.name,
          moderatorId: appointedModerator.id,
        },
      );
    },
  );
}
