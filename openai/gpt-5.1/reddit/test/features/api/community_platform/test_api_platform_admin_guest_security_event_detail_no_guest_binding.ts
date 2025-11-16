import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEventOfGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEventOfGuestuser";

export async function test_api_platform_admin_guest_security_event_detail_no_guest_binding(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authenticated connection
  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<ICommunityPlatformPlatformadmin.IJoin>(),
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one account status as platform admin
  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: typia.random<ICommunityPlatformAccountStatus.ICreate>(),
      },
    );
  typia.assert(createdStatus);

  // 3. Generate a random UUID that is expected to not correspond to any real security event
  const unknownSecurityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call the guest security event detail endpoint with the unknown ID and
  //    assert that it fails with an error (representing a not-found style behavior)
  await TestValidator.error(
    "guest-linked security event detail should fail for non-existent or unbound securityEventId",
    async () => {
      await api.functional.communityPlatform.guestUser.userSecurityEvents.guest.at(
        connection,
        {
          securityEventId: unknownSecurityEventId,
        },
      );
    },
  );
}
