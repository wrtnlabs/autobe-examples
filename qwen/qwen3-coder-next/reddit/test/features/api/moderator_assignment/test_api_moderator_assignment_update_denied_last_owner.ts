import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_moderator_assignment_update_denied_last_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registration and login
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: typia.random<string & tags.Format<"email">>().split("@")[0],
    displayName: "Test Owner",
  } satisfies IRedditCloneOwner.IJoin;
  const owner: IRedditCloneOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: ownerData,
    },
  );
  typia.assert(owner);
  // 2. Owner creates community
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = ownerConnection.headers;
  const communityData = {
    name: typia.random<string & tags.Format<"email">>().split("@")[0],
    description: "Test community for moderator assignment testing",
    icon_url: null,
  } satisfies IRedditCloneCommunity.ICreate;
  const community: IRedditCloneCommunity =
    await api.functional.redditClone.owner.communities.create(
      communityConnection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  // 3. Validate community has owner assignment
  TestValidator.equals("community has owner", community.owner.id, owner.id);
  // 4. Attempt to update owner's own assignment to demote (should fail)
  const updateData = {
    role: "moderator",
    status: "active",
  } satisfies IRedditCloneModeratorAssignment.IUpdate;
  await TestValidator.error("owner cannot demote themselves", async () => {
    await api.functional.redditClone.communities.moderator_assignments.updateModeratorAssignment(
      communityConnection,
      {
        communityId: community.id,
        body: updateData,
      },
    );
  });
  // 5. Verify community owner remains unchanged
  const updatedCommunity: IRedditCloneCommunity =
    await api.functional.redditClone.owner.communities.create(
      communityConnection,
      {
        body: {
          name: community.name,
          description: community.description,
          icon_url: community.iconUrl,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(updatedCommunity);
  TestValidator.equals("owner unchanged", updatedCommunity.owner.id, owner.id);
}
