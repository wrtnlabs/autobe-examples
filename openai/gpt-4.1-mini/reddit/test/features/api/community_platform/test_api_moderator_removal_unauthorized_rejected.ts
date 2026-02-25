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

export async function test_api_moderator_removal_unauthorized_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new moderator who becomes the community owner
  const ownerModConnection: api.IConnection = { host: connection.host };
  const ownerMod = await authorize_moderator_join(ownerModConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "owner_mod_" + RandomGenerator.alphaNumeric(8),
      displayName: "Owner Moderator",
      bio: "Community owner",
      avatarUrl: null,
    },
  });
  typia.assert(ownerMod);
  // 2. Create a community as the owner moderator
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerModConnection,
      { body: { name: "community_" + RandomGenerator.alphabets(6) } },
    );
  typia.assert(community);
  // 3. Register a new moderator who will be assigned as moderator (not owner)
  const modUserConnection: api.IConnection = { host: connection.host };
  const modUser = await authorize_moderator_join(modUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "mod_user_" + RandomGenerator.alphaNumeric(8),
      displayName: "Moderator User",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(modUser);
  // 4. Assign the new moderator to the community as "moderator" role
  const assignedModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      ownerModConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: modUser.id,
          role: "moderator",
        },
      },
    );
  typia.assert(assignedModerator);
  // 5. Register a non-owner, non-admin user (normal user account)
  const nonOwnerUserConnection: api.IConnection = { host: connection.host };
  const nonOwnerUser = await authorize_user_join(nonOwnerUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: "nonowner_" + RandomGenerator.alphaNumeric(8),
      displayName: "Non Owner User",
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: null,
    },
  });
  typia.assert(nonOwnerUser);
  // 6. Login as the non-owner, non-admin user
  const nonOwnerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInNonOwnerUser = await authorize_user_login(
    nonOwnerLoginConnection,
    {
      body: {
        email: nonOwnerUser.email,
        password: "Password123!",
      },
    },
  );
  typia.assert(loggedInNonOwnerUser);
  // 7. Attempt to delete the assigned moderator from the community
  // This should fail due to lack of authorization
  await TestValidator.error(
    "unauthorized moderator removal should be rejected",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.eraseModerator(
        nonOwnerLoginConnection,
        {
          communityId: community.id,
          moderatorId: modUser.id,
        },
      );
    },
  );
  // 8. Verify the moderator assignment still exists by re-assigning (expecting fail)
  // Since the removal was unauthorized, the assignment is still intact,
  // trying to re-assign should throw an error due to duplicate assignment
  await TestValidator.error(
    "re-assigning moderator should fail as still assigned",
    async () => {
      await generate_random_community_platform_moderator_communities_moderators_create_moderator(
        ownerModConnection,
        {
          params: { communityId: community.id },
          body: {
            communityModeratorId: modUser.id,
            role: "moderator",
          },
        },
      );
    },
  );
}
