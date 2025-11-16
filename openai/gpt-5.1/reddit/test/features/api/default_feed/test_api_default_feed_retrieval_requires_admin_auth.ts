import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that retrieving a default feed configuration requires platform admin
 * authentication.
 *
 * Business flow:
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join.
 * 2. As the authenticated platform admin, create a default feed configuration via
 *    POST /communityPlatform/platformAdmin/defaultFeeds.
 * 3. Attempt to GET the created default feed configuration without any
 *    Authorization header and assert that the request fails.
 * 4. Finally, GET the same default feed configuration again using the
 *    authenticated admin connection and assert that it succeeds and returns the
 *    expected configuration.
 */
export async function test_api_default_feed_retrieval_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated session
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a default feed configuration as the authenticated platform admin
  const createBody = typia.random<ICommunityPlatformDefaultFeed.ICreate>();
  const created: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to GET the default feed without Authorization and expect an error
  await TestValidator.error(
    "unauthenticated default feed retrieval should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.at(
        unauthenticated,
        {
          feedCode: created.feed_code,
        },
      );
    },
  );

  // 5. GET again with the authenticated admin connection and expect success
  const fetched: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.at(
      connection,
      {
        feedCode: created.feed_code,
      },
    );
  typia.assert(fetched);

  // Business assertion: fetched configuration should match created one
  // except for server-managed fields like id and timestamps.
  TestValidator.equals(
    "fetched default feed should match created feed on business fields",
    fetched,
    created,
    (key) => key === "id" || key === "created_at" || key === "updated_at",
  );
}
