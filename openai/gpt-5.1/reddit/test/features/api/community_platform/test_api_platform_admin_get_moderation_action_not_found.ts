import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify behavior when a platform admin requests a non-existent moderation
 * action.
 *
 * Business goal:
 *
 * - Ensure that the moderation-action detail endpoint fails (throws an error)
 *   instead of returning a successful payload when a platform administrator
 *   queries a moderationActionId that does not exist.
 * - Ensure that this is validated only in real backend mode; in SDK simulate
 *   mode, we gracefully accept that the simulator always returns random
 *   ICommunityPlatformModerationAction objects.
 *
 * High level flow:
 *
 * 1. Register a fresh platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Use random credentials and profile fields that satisfy
 *         ICommunityPlatformPlatformadmin.IJoin.
 *    - The SDK will automatically attach the issued JWT access token to the
 *         connection, authenticating subsequent calls as this platform admin.
 * 2. Generate a random UUID for moderationActionId.
 *
 *    - This ID is extremely unlikely to correspond to any existing moderation action
 *         in the database, especially since the admin account is brand new and
 *         we do not create any moderation actions in this test.
 * 3. Behavior depending on connection.simulate:
 *
 *    - When connection.simulate === true (Nestia simulator / mock mode): a. Call GET
 *         /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *         through
 *         api.functional.communityPlatform.platformAdmin.moderationActions.at,
 *         passing the random UUID. b. Assert that the returned value conforms
 *         to ICommunityPlatformModerationAction using typia.assert. c. Do not
 *         expect an error in this mode; the simulator always returns random
 *         data for successful schemas.
 *    - When connection.simulate is falsy (real backend mode): a. Use
 *         TestValidator.error to assert that the same call throws an error
 *         (typically an HttpError representing not-found semantics), because
 *         the moderation action does not exist. b. Do not inspect status codes
 *         or error payload content; merely validating that an error is thrown
 *         is sufficient and complies with the global testing constraints.
 *
 * This single function therefore validates that, in a real backend environment,
 * the moderation-action detail endpoint does not silently succeed when given a
 * non-existent ID, while remaining compatible with the Nestia simulator
 * behavior used in some test harnesses.
 */
export async function test_api_platform_admin_get_moderation_action_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(16),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Generate a random UUID that should not correspond to any real moderation action
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the moderation-action detail endpoint with behavior depending on simulate mode
  if (connection.simulate === true) {
    // In simulate mode, the SDK returns random ICommunityPlatformModerationAction data.
    const action =
      await api.functional.communityPlatform.platformAdmin.moderationActions.at(
        connection,
        { moderationActionId },
      );
    typia.assert<ICommunityPlatformModerationAction>(action);
  } else {
    // Against a real backend, a non-existent moderationActionId should cause an error.
    await TestValidator.error(
      "non-existent moderation action for platform admin must throw error",
      async () => {
        await api.functional.communityPlatform.platformAdmin.moderationActions.at(
          connection,
          { moderationActionId },
        );
      },
    );
  }
}
