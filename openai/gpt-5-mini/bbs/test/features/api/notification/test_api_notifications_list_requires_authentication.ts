import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumNotification";

export async function test_api_notifications_list_requires_authentication(
  connection: api.IConnection,
) {
  // Purpose: Verify that listing notifications requires an authenticated registered user.
  // Approach:
  // 1. Create an unauthenticated connection clone by setting headers: {}.
  // 2. Call the notifications listing endpoint with an empty request body (valid IRequest).
  // 3. Expect the call to throw an HTTP error with status 401 or 403.

  // 1) Build unauthenticated connection (do not mutate original connection.headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Attempt to list notifications as anonymous — should produce an HTTP Unauthorized/Forbidden
  await TestValidator.httpError(
    "anonymous request to notifications list must be rejected",
    [401, 403],
    async () => {
      await api.functional.econPoliticalForum.registeredUser.notifications.index(
        unauthConn,
        {
          body: {} satisfies IEconPoliticalForumNotification.IRequest,
        },
      );
    },
  );
}
