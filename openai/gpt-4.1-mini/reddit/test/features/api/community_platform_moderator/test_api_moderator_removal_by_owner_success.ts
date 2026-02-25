import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_moderators_create_moderator } from "../../../generate/generate_random_community_platform_moderator_communities_moderators_create_moderator";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_removal_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  /*
     Test scenario for successful removal of a moderator from a community by the community owner.
  
     Steps:
     1. Register a new user and create a community.
     2. Register a new moderator and assign the moderator role to this user in the created community.
     3. Authenticate as the community owner (user who created the community).
     4. Send DELETE request to remove the assigned moderator from the community.
     5. Verify HTTP 204 No Content status.
     6. Confirm the moderator assignment is removed from the community.
  
     Validations:
     - Proper authorization is required: only the community owner can remove moderators.
     - Deleting an existing moderator assignment succeeds.
     - Related records cascade handled correctly by the database.
     - Audit logging is assumed but not explicitly tested here.
    */
  // 1. Register user (community owner) with known password
  const userOwnerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = "owner_password_123";
  const ownerAuthorized = await authorize_user_join(userOwnerConnection, {
    body: {
      password: ownerPassword,
    },
  });
  typia.assert(ownerAuthorized);
  userOwnerConnection.headers = { Authorization: ownerAuthorized.token.access };
  // 2. Create community as the owner
  const community =
    await generate_random_community_platform_user_communities_create(
      userOwnerConnection,
      {},
    );
  typia.assert(community);
  // 3. Register moderator user
  const modConnection: api.IConnection = { host: connection.host };
  const modPassword = "mod_password_123";
  const modAuthorized = await authorize_moderator_join(modConnection, {
    body: {
      // Provide known password for possible future logins
      // However, moderator join DTO doesn't have password property according to provided data,
      // so we cannot set it. It's only email, username, displayName, bio, avatarUrl.
      // Hence, login step will use generated or default password as per flows.
    },
  });
  typia.assert(modAuthorized);
  modConnection.headers = { Authorization: modAuthorized.token.access };
  // 4. Assign moderator role to the moderator user in the community
  const moderatorAssignment =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      modConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: modAuthorized.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Authenticate as owner again (simulate actor switching, reuse connection)
  const ownerLoginConnection: api.IConnection = { host: connection.host };
  const ownerLoginAuthorized = await authorize_user_login(
    ownerLoginConnection,
    {
      body: {
        email: ownerAuthorized.email,
        password: ownerPassword,
      },
    },
  );
  typia.assert(ownerLoginAuthorized);
  ownerLoginConnection.headers = {
    Authorization: ownerLoginAuthorized.token.access,
  };
  // 6. Remove the assigned moderator from the community as the owner
  await api.functional.communityPlatform.moderator.communities.moderators.eraseModerator(
    ownerLoginConnection,
    {
      communityId: community.id,
      moderatorId: modAuthorized.id,
    },
  );
  // 7. Validate successful deletion by attempting to assign again same
  // moderator to check no conflict
  // (If existing assignment was not removed, this would raise duplicate error)
  const reassignModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      modConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: modAuthorized.id,
          role: "moderator",
        },
      },
    );
  typia.assert(reassignModerator);
}
