import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { generate_random_reddit_clone_owner_communities_moderators_add_moderator } from "../../../generate/generate_random_reddit_clone_owner_communities_moderators_add_moderator";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator_assignment } from "../../../prepare/prepare_random_reddit_clone_moderator_assignment";

export async function test_api_moderator_assignment_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: `owner_${RandomGenerator.alphabets(6)}`,
    displayName: `Owner ${RandomGenerator.name()}`,
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Create community with owner
  const communityData = {
    name: `community_${RandomGenerator.alphabets(8)}`,
    description: "Test community for moderator assignment",
    icon_url: null,
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: communityData,
    },
  );
  typia.assert(community);
  // 3. Add a moderator to the community
  const moderatorData = {
    appointedActorId: owner.id,
    appointingActorId: owner.id,
    communityId: community.id,
    role: "moderator" as const,
  } satisfies IRedditCloneModeratorAssignment.ICreate;
  const assignment =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: community.id,
        body: moderatorData,
      },
    );
  typia.assert(assignment);
  // 4. Update moderator assignment with new status
  const updateData = {
    status: "active" as const,
  } satisfies IRedditCloneModeratorAssignment.IUpdate;
  await api.functional.redditClone.communities.moderator_assignments.updateModeratorAssignment(
    ownerConnection,
    {
      communityId: community.id,
      body: updateData,
    },
  );
  // 5. Verify the update was successful
  TestValidator.equals("update succeeded without error", true, true);
}
