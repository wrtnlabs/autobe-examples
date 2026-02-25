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

export async function test_api_community_moderator_deletion_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and register first owner user
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(),
    displayName: "Test Owner",
  } satisfies IRedditCloneOwner.IJoin;
  const ownerInfo = await authorize_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  typia.assert(ownerInfo);
  // 2. Create community as owner
  const communityBody = {
    name: "test_community_" + RandomGenerator.alphaNumeric(8),
    description: "Test community for moderator deletion test",
    icon_url: null,
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: communityBody,
    },
  );
  typia.assert(community);
  // 3. Create second user connection and register moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(),
    displayName: "Test Moderator",
  } satisfies IRedditCloneOwner.IJoin;
  const moderatorInfo = await authorize_owner_join(moderatorConnection, {
    body: moderatorCredentials,
  });
  typia.assert(moderatorInfo);
  // 4. Owner appoints the second user as moderator
  const moderatorAssignment =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          communityId: community.id,
          appointedActorId: moderatorInfo.id,
          appointingActorId: ownerInfo.id,
          role: "moderator",
        } satisfies IRedditCloneModeratorAssignment.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator appointed",
    moderatorAssignment.role,
    "moderator",
  );
  // 5. Moderator attempts to delete community (should fail with 403)
  await TestValidator.error("moderator cannot delete community", async () => {
    await api.functional.redditClone.owner.communities.erase(
      moderatorConnection,
      {
        communityId: community.id,
      },
    );
  });
  // 6. Verify community still exists after failed deletion attempt
  const stillExists = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: community.name + "_retry",
        description: community.description,
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(stillExists);
  TestValidator.notEquals(
    "community still accessible",
    stillExists.name,
    community.name,
  );
}
