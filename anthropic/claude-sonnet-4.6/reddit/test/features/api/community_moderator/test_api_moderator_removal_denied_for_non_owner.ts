import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
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

export async function test_api_moderator_removal_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // Step 2: Create a community as the owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  const communityId = community.id;
  // Step 3: Register the second member (moderator-actor)
  const moderatorActorConnection: api.IConnection = { host: connection.host };
  const moderatorActorAuthorized = await authorize_member_join(
    moderatorActorConnection,
    {},
  );
  typia.assert(moderatorActorAuthorized);
  // Step 4: Assign the second member as a moderator (using owner's connection)
  const secondModeratorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId },
        body: { member_id: moderatorActorAuthorized.id },
      },
    );
  typia.assert(secondModeratorRecord);
  // Step 5: Register the third member (target moderator)
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMemberAuthorized = await authorize_member_join(
    thirdMemberConnection,
    {},
  );
  typia.assert(thirdMemberAuthorized);
  // Step 6: Assign the third member as a moderator (using owner's connection), record moderatorId
  const targetModeratorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId },
        body: { member_id: thirdMemberAuthorized.id },
      },
    );
  typia.assert(targetModeratorRecord);
  const moderatorId = targetModeratorRecord.id;
  // Test: The second member (a moderator, not owner) tries to remove the third member's moderator record
  // This should be denied with HTTP 403 Forbidden
  await TestValidator.error(
    "moderator cannot remove another moderator",
    async () => {
      await api.functional.community.member.communities.moderators.erase(
        moderatorActorConnection,
        {
          communityId,
          moderatorId,
        },
      );
    },
  );
}
