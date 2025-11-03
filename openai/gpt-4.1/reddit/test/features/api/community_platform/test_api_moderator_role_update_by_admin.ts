import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an admin can update moderator assignment properties for a
 * community.
 *
 * 1. Register a new admin
 * 2. Create a new community as the admin
 * 3. Assign a random user as moderator
 * 4. Update the moderator assignment's assigned_at as the admin
 * 5. Validate the change is reflected and unchanged fields remain
 * 6. Test forbidden scenario: non-admin attempts update and is blocked
 */
export async function test_api_moderator_role_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin for privileged operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://test.community/platform/signup",
        referrer: "https://test.community/landing",
        ip: undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new community as admin (token now set in connection)
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a random user summary for moderator assignment (simulate user exists)
  const user: ICommunityPlatformUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    display_name: RandomGenerator.name(),
  };

  // Assign user as moderator in the community
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          user_id: user.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "initial moderator assignment correct community",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "initial moderator assignment correct user",
    moderatorAssignment.user.id,
    user.id,
  );

  // 4. Update moderator assignment's assigned_at property to a new timestamp (admin auth)
  const newAssignedAt = new Date(Date.now() + 1000 * 60 * 10).toISOString(); // 10 minutes later
  const updatedModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
        body: {
          assigned_at: newAssignedAt,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);

  TestValidator.equals(
    "assigned_at updated",
    updatedModerator.assigned_at,
    newAssignedAt,
  );
  TestValidator.equals(
    "community unchanged after update",
    updatedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "user unchanged after update",
    updatedModerator.user.id,
    user.id,
  );

  // 5. Attempt update as non-admin (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update forbidden for unauthenticated connection",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.update(
        unauthConn,
        {
          communityId: community.id,
          moderatorId: moderatorAssignment.id,
          body: {
            assigned_at: new Date(Date.now() + 2000).toISOString(),
          } satisfies ICommunityPlatformCommunityModerator.IUpdate,
        },
      );
    },
  );
}
