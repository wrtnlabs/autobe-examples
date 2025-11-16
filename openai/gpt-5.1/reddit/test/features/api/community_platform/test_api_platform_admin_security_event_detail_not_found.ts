import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";

/**
 * Ensure platform admin receives not-found when requesting non-existent
 * security event.
 *
 * Business purpose
 *
 * - Platform administrators use the user security event detail endpoint to
 *   inspect individual security events for audit and investigation purposes.
 * - When a requested event id does not exist, the API must respond with a clear
 *   not-found error instead of returning a DTO or masking the condition as some
 *   other failure.
 *
 * Flow
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join.
 *
 *    - This both provisions the admin row and issues JWT tokens.
 *    - The SDK automatically stores the access token into the connection headers so
 *         subsequent calls act as this platformAdmin actor.
 * 2. Optionally create a baseline account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses.
 *
 *    - This mirrors a realistic configuration where account statuses exist, but it
 *         does not create any security events.
 * 3. Generate a random UUID to represent a securityEventId that is extremely
 *    unlikely to exist in the clean test database.
 * 4. Call GET
 *    /communityPlatform/platformAdmin/userSecurityEvents/{securityEventId} as
 *    the authenticated platform admin with that random id.
 * 5. Assert that the call fails with an HttpError whose status code is 404,
 *    indicating a not-found condition for the requested security event.
 */
export async function test_api_platform_admin_security_event_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated context
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Optionally seed at least one account status to mimic production config
  const statusBody = typia.random<ICommunityPlatformAccountStatus.ICreate>();
  const status =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(status);

  // 3. Generate a random UUID that should not match any existing security event
  const nonexistentSecurityEventId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Assert that requesting this non-existent event id results in 404
  await TestValidator.httpError(
    "platform admin requesting non-existent security event receives 404",
    404,
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.at(
        connection,
        {
          securityEventId: nonexistentSecurityEventId,
        },
      );
    },
  );
}
