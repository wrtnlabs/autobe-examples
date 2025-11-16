import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { ICommunityPlatformUserSecurityEventOfPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEventOfPlatformadmin";

/**
 * Verify platform-admin security event binding absence behavior.
 *
 * Business intent:
 *
 * - The endpoint GET
 *   /communityPlatform/platformAdmin/userSecurityEvents/{securityEventId}/platformAdmin
 *   should only succeed when there is a platform-admin-specific binding for the
 *   given security event.
 * - When a securityEventId has no such binding (either because the underlying
 *   event belongs to a different actor type or does not exist at all), the
 *   endpoint must not return any binding and should result in an error (404/4xx
 *   in the real API).
 *
 * Due to the limited API surface exposed to the test harness, we cannot
 * explicitly create a non-admin generic security event. Instead, we perform a
 * robust negative test by:
 *
 * 1. Registering a platform administrator (join) to establish an authenticated
 *    platformAdmin context.
 * 2. Creating at least one account status as required domain configuration
 *    (ensuring the master catalog exists for other flows, even if unused in
 *    this specific request).
 * 3. Generating a random UUID as a stand-in for a securityEventId that is almost
 *    certainly not bound to any platform administrator security event.
 * 4. Calling the platformAdmin binding endpoint with that random id and asserting
 *    that the call fails via TestValidator.error, thereby verifying that the
 *    endpoint does not accidentally leak data for non-bound events.
 */
export async function test_api_platformadmin_security_event_binding_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain authenticated context.
  const adminJoinInput = typia.random<ICommunityPlatformPlatformadmin.IJoin>();

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Ensure at least one account status exists for domain integrity.
  const accountStatusCreateBody =
    typia.random<ICommunityPlatformAccountStatus.ICreate>();

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Generate a random UUID for a securityEventId that is extremely
  //    unlikely to correspond to an existing platform-admin-bound event.
  const randomSecurityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call the platformAdmin security event binding endpoint with the random
  //    id and assert that it fails, meaning no binding is exposed for
  //    non-bound events.
  await TestValidator.error(
    "platform-admin security event binding should not exist for random UUID",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.platformAdmin.at(
        connection,
        {
          securityEventId: randomSecurityEventId,
        },
      );
    },
  );
}
