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
 * Verify that the platform admin moderation action detail endpoint rejects
 * unauthenticated access.
 *
 * Business goal: Ensure that sensitive moderation action details under the
 * platform admin namespace cannot be fetched without a valid authenticated
 * session. This protects enforcement history and internal notes from being
 * exposed to anonymous callers.
 *
 * Scenario:
 *
 * 1. Do not perform any platform admin authentication in this test.
 * 2. Build an unauthenticated connection by cloning the provided connection and
 *    overriding its headers with an empty object, without touching
 *    connection.headers afterwards.
 * 3. Generate a random UUID to use as the moderationActionId path parameter;
 *    whether it exists is irrelevant because the auth layer must block the
 *    request before any existence check.
 * 4. Call GET
 *    /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *    via api.functional.communityPlatform.platformAdmin.moderationActions.at
 *    using the unauthenticated connection.
 * 5. Use TestValidator.error to assert that the call fails (throws), without
 *    asserting on HTTP status code or response body content, in line with the
 *    global E2E testing constraints.
 */
export async function test_api_platform_admin_cannot_access_without_authentication(
  connection: api.IConnection,
) {
  // 1. Keep the original connection as-is; do not authenticate a platform admin.
  // We rely on the test harness to provide a baseline connection, but we will
  // make a fresh unauthenticated clone for this specific call.

  // 2. Create an unauthenticated connection by overriding headers with an
  // empty object. After creation, we must not touch headers again.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare a random moderationActionId UUID. Existence is not relevant;
  // the test only verifies that authentication is required.
  const moderationActionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to call the moderation action detail endpoint without
  // authentication and assert that it fails.
  await TestValidator.error(
    "platform admin moderation action detail requires authentication",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationActions.at(
        unauthenticatedConnection,
        {
          moderationActionId,
        },
      );
    },
  );
}
