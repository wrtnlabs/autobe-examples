import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that updating a non-existent default feed configuration fails with
 * an error even when a platform admin is properly authenticated.
 *
 * Business context
 *
 * - Default feeds are managed only by platform admins under
 *   `/communityPlatform/platformAdmin/defaultFeeds`.
 * - Updates are addressed by the business identifier `feedCode` in the path.
 * - The service must not treat an unknown feedCode as an implicit create; it
 *   should instead fail, surfacing an error to the caller.
 *
 * Test steps
 *
 * 1. Register (join) a platform admin via POST /auth/platformAdmin/join to get an
 *    authenticated admin context. The SDK takes care of putting the access
 *    token into `connection.headers` internally.
 * 2. Create a real default feed configuration via POST
 *    /communityPlatform/platformAdmin/defaultFeeds using a distinct `feed_code`
 *    so there is at least one valid record in the table.
 * 3. Construct a bogus feed code string that is guaranteed to differ from the
 *    created one, e.g. by suffixing with `"_nonexistent"`.
 * 4. Call PUT /communityPlatform/platformAdmin/defaultFeeds/{feedCode} using the
 *    bogus code and a syntactically valid ICommunityPlatformDefaultFeed.IUpdate
 *    payload (for example toggling `is_active` or `is_platform_default`).
 * 5. Use TestValidator.error to assert that this update request fails with an
 *    error rather than returning a normal ICommunityPlatformDefaultFeed object,
 *    without asserting a specific HTTP status code.
 * 6. There is no read-by-feedCode API provided in this test context, so we cannot
 *    re-fetch the original configuration. Instead, this test focuses on
 *    validating that the update with a non-existent code does not succeed.
 */
export async function test_api_default_feed_update_not_found_feed_code(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a real default feed configuration
  const createBody = {
    feed_code: `default_${RandomGenerator.alphaNumeric(8)}`,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const created =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(created);

  // 3. Construct a bogus feedCode that is guaranteed different from the created one
  const bogusFeedCode = `${created.feed_code}_nonexistent`;

  // 4. Prepare a valid update payload
  const updateBody = {
    is_active: false,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  // 5. Call update with bogus feedCode and assert that it fails with an error
  await TestValidator.error(
    "updating non-existent default feed must fail with error",
    async () => {
      return await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
        connection,
        {
          feedCode: bogusFeedCode,
          body: updateBody,
        },
      );
    },
  );
}
