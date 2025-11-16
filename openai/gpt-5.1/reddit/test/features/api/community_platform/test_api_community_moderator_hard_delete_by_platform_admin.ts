import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate hard deletion of a community moderator by a platform administrator.
 *
 * This test ensures that a platform admin can permanently remove a community
 * moderator identity so that it is no longer retrievable through the
 * platformAdmin-facing moderator management API.
 *
 * High-level flow:
 *
 * 1. Register a platform administrator using the platformAdmin join endpoint so we
 *    obtain a valid admin account (and an authenticated session).
 * 2. While authenticated as that platformAdmin, register a new community moderator
 *    via the communityModerator join endpoint. This creates the moderator actor
 *    row and also authenticates as the moderator, overwriting the Authorization
 *    token on the shared connection.
 * 3. Switch the connection back to the platformAdmin actor using the platformAdmin
 *    login endpoint, because the moderator join operation replaced the token on
 *    the connection.
 * 4. As platformAdmin, fetch the moderator record via the
 *    communityPlatform/platformAdmin/communityModerators/{communityModeratorId}
 *    GET endpoint, asserting that it exists and that the returned summary id
 *    matches the moderator id from the join response.
 * 5. Still as platformAdmin, call the DELETE
 *    /communityPlatform/platformAdmin/communityModerators/{communityModeratorId}
 *    endpoint to erase the moderator record.
 * 6. Finally, as platformAdmin, attempt to fetch the same moderator id again and
 *    assert that this call fails by using TestValidator.error, which
 *    demonstrates that the moderator record is no longer addressable (hard
 *    delete semantics from the API consumer perspective).
 */
export async function test_api_community_moderator_hard_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (auto-authenticates as platformAdmin)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(10)}@admin.example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register a new community moderator (this will authenticate as moderator)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@moderator.example.com`,
    password: "ModeratorP@ssw0rd",
    display_name: RandomGenerator.name(),
    ip: "198.51.100.23",
    href: "https://community.example.com/moderator/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3. Switch back to platformAdmin actor using login
  const adminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 4. As platformAdmin, confirm the moderator exists via GET /communityModerators/{id}
  const beforeDeleteSummary: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.at(
      connection,
      {
        communityModeratorId: moderatorAuthorized.id,
      },
    );
  typia.assert(beforeDeleteSummary);

  TestValidator.equals(
    "moderator summary id must match created moderator id before deletion",
    beforeDeleteSummary.id,
    moderatorAuthorized.id,
  );

  // 5. Delete the moderator via platformAdmin DELETE endpoint
  await api.functional.communityPlatform.platformAdmin.communityModerators.erase(
    connection,
    {
      communityModeratorId: moderatorAuthorized.id,
    },
  );

  // 6. Verify that subsequent GET now fails, indicating hard delete behavior
  await TestValidator.error(
    "fetching deleted moderator by id must fail after erase",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.at(
        connection,
        {
          communityModeratorId: moderatorAuthorized.id,
        },
      );
    },
  );
}
