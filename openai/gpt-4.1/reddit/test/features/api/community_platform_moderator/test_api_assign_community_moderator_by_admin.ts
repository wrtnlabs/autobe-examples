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
 * Validate assigning a user as a community moderator by an administrator.
 *
 * Steps:
 *
 * 1. Register a new admin (who has permission to create communities and assign
 *    moderators).
 * 2. Admin creates a community.
 * 3. Register a regular user (who will become moderator).
 * 4. Admin assigns the user as a moderator in the created community.
 * 5. Attempt to assign the same user as moderator again (should fail due to
 *    uniqueness constraint).
 * 6. Attempt moderator assignment as a regular user (should fail due to lack of
 *    admin permissions).
 */
export async function test_api_assign_community_moderator_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: "https://admin.join.test/", // minimal valid URI
        referrer: "https://admin.referrer.test/",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create community as admin
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: communityName as string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">,
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 10,
          }) as string & tags.MinLength<1> & tags.MaxLength<250>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(14),
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://user.join.test/",
        referrer: "https://user.referrer.test/",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 4. Assign user as community moderator by admin
  const assignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          user_id: user.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "Moderator user id matches assigned user",
    assignment.user.id,
    user.id,
  );
  TestValidator.equals(
    "Moderator community id matches target community",
    assignment.community.id,
    community.id,
  );

  // 5. Attempt assigning the same user as moderator again (should fail, uniqueness constraint)
  await TestValidator.error(
    "Cannot assign an already-moderator user again (uniqueness constraint)",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            user_id: user.id,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // 6. Attempt to assign a user as moderator while authenticated as a regular user (should fail)
  // Switch context by using the latest user's authentication (connection's token becomes that user)
  // Create a new user for uniqueness
  const anotherAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: anotherAdminEmail,
        password: RandomGenerator.alphaNumeric(18),
        display_name: RandomGenerator.name(),
        href: "https://admin2.join.test/",
        referrer: "https://admin2.referrer.test/",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(newAdmin);

  // Register a new user who will attempt unauthorized moderator assignment
  const intruderUserEmail = typia.random<string & tags.Format<"email">>();
  const intruder: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: intruderUserEmail,
        password: RandomGenerator.alphaNumeric(11),
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://intruder.join.test/",
        referrer: "https://intruder.referrer.test/",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(intruder);

  // Now try to assign a moderator use the regular user session (token switches via join)
  await TestValidator.error(
    "Regular user cannot assign a moderator (admin permissions required)",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            user_id: newAdmin.id, // try to assign admin as moderator with regular user (should fail)
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
}
