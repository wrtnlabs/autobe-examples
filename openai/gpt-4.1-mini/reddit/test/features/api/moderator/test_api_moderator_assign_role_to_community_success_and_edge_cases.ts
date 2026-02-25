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

export async function test_api_moderator_assign_role_to_community_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test assigning a moderator role to an existing community by an authorized moderator user who is the community owner.
  // 1) Moderator registers an account via /auth/moderator/join.
  // 2) The owner (moderator) creates a community via /user/communities.
  // 3) The owner assigns another user as moderator in that community.
  // Validate successful creation, role assignment, timestamps, and database consistency.
  // Confirm authorization checks.
  // Test edge cases including invalid role, duplicate assignment, unauthorized user assignment.
  ////////////////////////////////////////
  // 1. Moderator registers an owner moderator with fixed password
  const ownerModeratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const ownerPassword = "ownerP@ssw0rd!";
  const ownerModeratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: `https://avatars.example.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ICommunityPlatformModerator.IJoin;
  const ownerModeratorRaw = await authorize_moderator_join(
    ownerModeratorJoinConnection,
    {
      body: ownerModeratorJoinBody,
    },
  );
  const ownerModerator = typia.assert(ownerModeratorRaw);
  // 2. Login the owner moderator with known password (password set via variable)
  const ownerModeratorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const ownerLoggedInModerator = await authorize_moderator_login(
    ownerModeratorLoginConnection,
    {
      body: {
        email: ownerModeratorJoinBody.email,
        password: ownerPassword,
      },
    },
  );
  typia.assert(ownerLoggedInModerator);
  // Use ownerLoggedInModerator connection
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = {
    Authorization: ownerLoggedInModerator.token.access,
  };
  // 3. Owner moderator creates the community
  // Since the community creation endpoint requires user actor, we register and login a user for owner moderator to use
  // 3.a. Register and login user for owner moderator
  const ownerUserJoinConnection: api.IConnection = { host: connection.host };
  const ownerUserPassword = "userOwnerPass123!";
  const ownerUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: ownerUserPassword,
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const ownerUser = await authorize_user_join(ownerUserJoinConnection, {
    body: ownerUserJoinBody,
  });
  typia.assert(ownerUser);
  // 3.b. Login user for owner moderator
  const ownerUserLoginConnection: api.IConnection = { host: connection.host };
  const ownerUserLoggedIn = await authorize_user_login(
    ownerUserLoginConnection,
    {
      body: {
        email: ownerUserJoinBody.email,
        password: ownerUserPassword,
      },
    },
  );
  typia.assert(ownerUserLoggedIn);
  // Use ownerUserLoggedIn connection to create community
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: ownerUserLoggedIn.token.access };
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `testcommunity_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://icons.example.com/${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(community);
  // 4. Register a separate target moderator user to be assigned as moderator
  const targetModeratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const targetModeratorPassword = "targetModPass!234";
  const targetModeratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
    avatarUrl: `https://avatars.example.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ICommunityPlatformModerator.IJoin;
  const targetModerator = await authorize_moderator_join(
    targetModeratorJoinConnection,
    {
      body: targetModeratorJoinBody,
    },
  );
  typia.assert(targetModerator);
  // 5. Owner moderator assigns target user as 'moderator'
  const createModeratorResponse =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: targetModerator.id,
          role: "moderator",
        },
      },
    );
  typia.assert(createModeratorResponse);
  // Validate role correctness
  TestValidator.equals(
    "assigned role should be 'moderator'",
    createModeratorResponse.role,
    "moderator",
  );
  // Validate timestamps presence and format
  TestValidator.predicate(
    "created_at is a valid ISO date",
    !isNaN(Date.parse(createModeratorResponse.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date",
    !isNaN(Date.parse(createModeratorResponse.updated_at)),
  );
  // Validate communityId matches
  TestValidator.equals(
    "communityId matches",
    createModeratorResponse.community_id,
    community.id,
  );
  // Validate moderatorId matches
  TestValidator.equals(
    "communityModeratorId matches",
    createModeratorResponse.community_moderator_id,
    targetModerator.id,
  );
  // 6. Edge cases
  // a. Assign with invalid role values
  await TestValidator.error(
    "assigning with invalid role should fail",
    async () => {
      await generate_random_community_platform_moderator_communities_moderators_create_moderator(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            communityModeratorId: targetModerator.id,
            // The role is invalid, but must keep type safety, so use string casted to any
            role: "invalid_role" as any,
          },
        },
      );
    },
  );
  // b. Duplicate assignment (same user & role)
  await TestValidator.error(
    "duplicate moderator assignment should fail",
    async () => {
      await generate_random_community_platform_moderator_communities_moderators_create_moderator(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            communityModeratorId: targetModerator.id,
            role: "moderator",
          },
        },
      );
    },
  );
  // c. Unauthorized user attempts to assign moderator role
  // Register and login a normal user (not owner, not moderator)
  const unauthorizedUserJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "unauthUserPass123",
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const unauthorizedUser = await authorize_user_join(
    unauthorizedUserJoinConnection,
    {
      body: unauthorizedUserJoinBody,
    },
  );
  typia.assert(unauthorizedUser);
  const unauthorizedUserLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedLoggedInUser = await authorize_user_login(
    unauthorizedUserLoginConnection,
    {
      body: {
        email: unauthorizedUserJoinBody.email,
        password: unauthorizedUserJoinBody.password,
      },
    },
  );
  typia.assert(unauthorizedLoggedInUser);
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  unauthorizedUserConnection.headers = {
    Authorization: unauthorizedLoggedInUser.token.access,
  };
  // Unauthorized user attempts assignment
  await TestValidator.error(
    "unauthorized user cannot assign moderator",
    async () => {
      await generate_random_community_platform_moderator_communities_moderators_create_moderator(
        unauthorizedUserConnection,
        {
          params: { communityId: community.id },
          body: {
            communityModeratorId: targetModerator.id,
            role: "moderator",
          },
        },
      );
    },
  );
}
