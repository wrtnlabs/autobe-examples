import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that deleting a default feed configuration requires platform admin
 * authentication and that a properly authenticated admin can delete an existing
 * configuration.
 *
 * Scenario:
 *
 * 1. From an unauthenticated connection, attempt to DELETE a default feed
 *    configuration using an arbitrary feedCode. Expect the request to fail with
 *    an HTTP error due to missing/invalid admin authentication, without
 *    depending on a specific status code.
 * 2. Register a new platform administrator via POST /auth/platformAdmin/join. The
 *    SDK will automatically attach the issued JWT access token to the
 *    connection.
 * 3. As the authenticated platform admin, create a new default feed configuration
 *    via POST /communityPlatform/platformAdmin/defaultFeeds and capture its
 *    feed_code.
 * 4. Perform DELETE /communityPlatform/platformAdmin/defaultFeeds/{feedCode} using
 *    the captured feed_code and the authenticated connection, and assert that
 *    no error is thrown.
 * 5. Immediately attempt a second DELETE for the same feed_code and assert that
 *    this call now fails with an HttpError, reflecting the documented
 *    non-idempotent delete semantics.
 *
 * This test validates that:
 *
 * - Only authenticated platform administrators can invoke the delete endpoint.
 * - Unauthenticated callers cannot successfully delete default feed
 *   configurations.
 * - A valid admin can create and then delete a configuration end-to-end.
 * - Deleting the same configuration twice results in an error, indicating that
 *   the resource is truly removed after the first successful deletion.
 */
export async function test_api_default_feed_delete_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Unauthenticated deletion attempt: clone connection without headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated default feed deletion must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.erase(
        unauthConnection,
        { feedCode: RandomGenerator.alphaNumeric(12) },
      );
    },
  );

  // 2. Register a new platform admin, SDK will set Authorization header on `connection`
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.local/join",
    referrer: "https://admin.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 3. Create a new default feed configuration as this admin
  const createBody = {
    feed_code: RandomGenerator.alphaNumeric(10),
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const created: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  TestValidator.equals(
    "created feed_code must match request body",
    created.feed_code,
    createBody.feed_code,
  );

  // 4. Delete the created configuration successfully
  await api.functional.communityPlatform.platformAdmin.defaultFeeds.erase(
    connection,
    { feedCode: created.feed_code },
  );

  // 5. Second delete must fail because the record has already been removed
  await TestValidator.error(
    "second deletion of same default feed must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.erase(
        connection,
        { feedCode: created.feed_code },
      );
    },
  );
}
