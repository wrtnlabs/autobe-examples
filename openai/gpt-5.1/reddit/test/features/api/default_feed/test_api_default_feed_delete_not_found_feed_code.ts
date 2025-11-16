import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that deleting a non-existent default feed configuration yields an
 * error while an existing configuration remains deletable.
 *
 * Business intent:
 *
 * - Platform admins use `DELETE
 *   /communityPlatform/platformAdmin/defaultFeeds/{feedCode}` to remove
 *   specific default feed configurations.
 * - When a bogus feedCode is provided, the API must signal failure instead of
 *   silently succeeding, so admin tooling can accurately reflect that nothing
 *   was deleted.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a platform admin via `auth.platformAdmin.join`.
 *    This call also configures the Authorization header on the connection
 *    through the SDK.
 * 2. Create a real default feed configuration using
 *    `communityPlatform.platformAdmin.defaultFeeds.create` and capture its
 *    `feed_code` from the response.
 * 3. Construct a bogus feed code that _cannot_ be the same as the created
 *    configuration’s `feed_code` (for example, prefix the real code with
 *    `"non-existent-"`).
 * 4. Call `defaultFeeds.erase` with the bogus feedCode and assert that the call
 *    fails by using `TestValidator.error`, without asserting specific HTTP
 *    status codes.
 * 5. Call `defaultFeeds.erase` again, this time with the real `feed_code`, and
 *    assert that no error is thrown, proving that the actual configuration was
 *    still deletable and that the earlier failure was specific to the bogus
 *    code.
 */
export async function test_api_default_feed_delete_not_found_feed_code(
  connection: api.IConnection,
) {
  // 1. Platform admin registration and authentication
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a real default feed configuration
  const createBody = typia.random<ICommunityPlatformDefaultFeed.ICreate>();
  const created: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 3. Construct a bogus feedCode that cannot match the created feed_code
  const bogusFeedCode = `non-existent-${created.feed_code}`;

  // 4. Attempt to delete using bogus feedCode and expect error
  await TestValidator.error(
    "erase with bogus feed code should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.erase(
        connection,
        { feedCode: bogusFeedCode },
      );
    },
  );

  // 5. Delete the real configuration successfully
  await api.functional.communityPlatform.platformAdmin.defaultFeeds.erase(
    connection,
    { feedCode: created.feed_code },
  );
}
