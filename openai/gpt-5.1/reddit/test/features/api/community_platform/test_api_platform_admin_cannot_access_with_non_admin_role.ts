import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a non-admin actor (community moderator) cannot access the
 * platform-admin-only moderation action detail endpoint.
 *
 * Business intent:
 *
 * - The platform exposes a detail endpoint at GET
 *   /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *   which should only be readable by platformAdmin actors.
 * - Community moderators may also perform moderation actions, but they must not
 *   be able to read platformAdmin-scoped actions via this endpoint.
 *
 * High-level flow:
 *
 * 1. Join as a platform admin using /auth/platformAdmin/join.
 *
 *    - This both creates the admin account and authenticates the connection as that
 *         administrator, attaching an access token into
 *         connection.headers.Authorization via the SDK.
 * 2. As the platform admin, attempt to fetch a moderation action once using a
 *    randomly generated moderationActionId.
 *
 *    - In simulate mode, this will always succeed and give a DTO; in a real
 *         environment, it may 404 if the ID does not exist. On success we keep
 *         the returned moderation action id; on failure we keep using the
 *         random UUID for the negative authorization test.
 * 3. Join as a community moderator using /auth/communityModerator/join.
 *
 *    - This call will automatically attach the moderator token to
 *         connection.headers.Authorization, effectively switching the current
 *         actor from platformAdmin to communityModerator.
 * 4. As the community moderator, attempt to call GET
 *    /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *    using the chosen moderationActionId from step 2.
 * 5. Use TestValidator.error to assert that this call results in an error, meaning
 *    the operation is not authorized for this non-admin role.
 *
 * Implementation constraints:
 *
 * - Never touch connection.headers directly; rely exclusively on the provided
 *   auth join/login functions for token handling.
 * - Do not assert specific HTTP status codes or error payload structures; only
 *   assert that an error occurs.
 * - Use only the provided DTO types for request bodies and typia.assert for
 *   response validation, without additional manual type checks.
 */
export async function test_api_platform_admin_cannot_access_with_non_admin_role(
  connection: api.IConnection,
) {
  // 1. Register (and implicitly authenticate as) a platform admin.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, attempt to obtain a moderation action ID to test.
  let targetModerationActionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  try {
    const moderationAction: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.platformAdmin.moderationActions.at(
        connection,
        {
          moderationActionId: targetModerationActionId,
        },
      );
    // If successful, assert the DTO and use its ID as the canonical target.
    typia.assert(moderationAction);
    targetModerationActionId = moderationAction.id;
  } catch {
    // If this fails (e.g., not found for random ID), ignore the error and
    // keep using the random UUID for the negative authorization test. The
    // authorization behavior under a non-admin role should not depend on
    // resource existence.
  }

  // 3. Register a community moderator, switching the connection actor.
  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 4. As community moderator, attempt to access the platform-admin-only
  //    moderation action detail endpoint. This must fail with an error.
  await TestValidator.error(
    "community moderator cannot access platformAdmin moderationActions.at",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationActions.at(
        connection,
        {
          moderationActionId: targetModerationActionId,
        },
      );
    },
  );
}
