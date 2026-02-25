import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_moderators_create } from "../../../generate/generate_random_community_platform_admin_communities_moderators_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test updating moderator assignment notes by an authorized platform administrator.
 * 1. Admin authenticates and creates community
 * 2. Regular user joins and authenticates
 * 3. Admin assigns user as moderator with initial notes
 * 4. Admin updates moderator assignment notes
 * 5. Validate notes update and relationship integrity
 */
export async function test_api_moderator_assignment_update_admin_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin1234",
    display_name: RandomGenerator.name(),
    permissions_level: "super_admin",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Create community for testing
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Regular user setup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "user1234",
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
    avatar_url: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(userAuth);
  // 4. Create initial moderator assignment
  const initialModerator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          user_id: userAuth.id,
          role_level: "moderator",
          notes: "Initial moderator assignment notes",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(initialModerator);
  // 5. Update moderator assignment notes
  const updatedNotes =
    "Updated moderator assignment notes with additional details";
  const updatedAssignment =
    await api.functional.communityPlatform.admin.communities.moderators.update(
      adminConnection,
      {
        communityId: community.id,
        moderatorId: initialModerator.id,
        body: {
          notes: updatedNotes,
        } satisfies ICommunityPlatformModeratorAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // 6. Validate the update
  TestValidator.equals(
    "notes field updated",
    updatedAssignment.notes,
    updatedNotes,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedAssignment.updated_at,
    initialModerator.updated_at,
  );
  TestValidator.equals(
    "community relationship preserved",
    updatedAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "user relationship preserved",
    updatedAssignment.assignedUser.id,
    userAuth.id,
  );
  TestValidator.equals(
    "assignment relationship intact",
    updatedAssignment.assignedBy.id,
    adminConnection.headers?.Authorization
      ? userAuth.id
      : initialModerator.assigned_by.id,
  );
}
