import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure that deleting a non-existent platform setting fails with an error.
 *
 * Business context: Platform-wide configuration rows in
 * `community_platform_platform_settings` should not be silently ignored when a
 * delete is attempted on a non-existent ID. Instead, the backend must surface
 * an error (typically 404 Not Found) so that operator tooling and automated
 * jobs are aware that the requested configuration row does not exist.
 *
 * Test steps:
 *
 * 1. Register and authenticate a platform administrator via POST
 *    /auth/platformAdmin/join.
 *
 *    - Use a fully populated ICommunityPlatformPlatformadmin.IJoin payload.
 *    - Rely on the SDK to persist the access token into the shared connection.
 * 2. Generate a random UUID value to act as the `platformSettingId` path parameter
 *    for the delete operation, without creating any settings rows.
 * 3. Invoke DELETE
 *    /communityPlatform/platformAdmin/platformSettings/{platformSettingId} via
 *    api.functional.communityPlatform.platformAdmin.platformSettings.erase.
 * 4. Assert that the call throws an HttpError using TestValidator.error, treating
 *    any thrown HttpError as success and not checking specific HTTP status
 *    codes.
 */
export async function test_api_platform_setting_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Generate a random UUID that almost certainly does not exist
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Attempt to delete with non-existent ID and expect an error
  await TestValidator.error(
    "delete non-existent platform setting must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformSettings.erase(
        connection,
        { platformSettingId: nonExistingId },
      );
    },
  );
}
