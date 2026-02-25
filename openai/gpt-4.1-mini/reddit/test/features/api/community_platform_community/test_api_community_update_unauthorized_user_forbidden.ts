import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_update_unauthorized_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Test that a user who is not the owner or an admin cannot update the community.
  // Authenticate two separate users, create a community with the first user as owner.
  // Attempt to update the community details while authenticated as the second user.
  // Verify the operation is rejected with 403 Forbidden error due to lack of authorization.
  // Confirm no changes are made to the community.
  // Actor 1: User creation and authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = await authorize_user_join(ownerConnection, {});
  // Set token for owner
  ownerConnection.headers = { Authorization: ownerUser.token.access };
  // Create community with owner user
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // Actor 2: Another user creation and authentication
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await authorize_user_join(otherUserConnection, {});
  otherUserConnection.headers = { Authorization: otherUser.token.access };
  // Attempt to update the community details with unauthorized user
  const newName = community.name + "_updated";
  const newDescription = community.description + " updated description";
  const newIconUrl = community.iconUrl + "/new.png";
  const updateBody: ICommunityPlatformCommunity.IUpdate = {
    name: newName,
    description: newDescription,
    icon_url: newIconUrl,
  };
  await TestValidator.httpError(
    "unauthorized user forbidden to update community",
    403,
    async () => {
      await api.functional.communityPlatform.user.communities.updateCommunity(
        otherUserConnection,
        {
          communityId: community.id,
          body: updateBody,
        },
      );
    },
  );
  // Confirm that original community data remains unchanged
  // Since there is no GET operation for community, we use updateCommunity with empty body to fetch current data
  const refreshedCommunity =
    await api.functional.communityPlatform.user.communities.updateCommunity(
      ownerConnection,
      {
        communityId: community.id,
        body: {}, // no update, just fetching latest
      },
    );
  typia.assert(refreshedCommunity);
  TestValidator.equals(
    "community name unchanged",
    refreshedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description unchanged",
    refreshedCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "community iconUrl unchanged",
    refreshedCommunity.iconUrl,
    community.iconUrl,
  );
}
