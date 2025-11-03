import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

/**
 * Test that guest users cannot access the member notifications endpoint.
 *
 * This test validates authentication enforcement by attempting to access the
 * member notifications endpoint without a valid JWT token. The test
 * demonstrates that the API strictly enforces authentication requirements and
 * denies access to unauthenticated guests with a 401 Unauthorized response,
 * preventing information disclosure to non-authenticated users.
 *
 * The test includes a dependency that creates an authenticated member account,
 * demonstrating the contrast between authenticated member access and guest
 * access to the same endpoint.
 *
 * Steps:
 *
 * 1. Create an authenticated member account
 * 2. Verify authenticated member can access notifications
 * 3. Create unauthenticated guest connection without tokens
 * 4. Attempt to access notifications as guest without authentication
 * 5. Verify 401 Unauthorized error is returned for guest access
 */
export async function test_api_member_notifications_guest_user_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Verify authenticated member can access notifications
  const notificationsResponse =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(notificationsResponse);
  TestValidator.predicate(
    "authenticated member should receive pagination data",
    notificationsResponse.pagination !== undefined,
  );

  // Step 3: Create unauthenticated guest connection without tokens
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4 & 5: Attempt to access notifications as guest and verify 401 error
  await TestValidator.httpError(
    "guest user without authentication should be denied access with 401 Unauthorized",
    401,
    async () => {
      await api.functional.discussionBoard.member.notifications.get(
        guestConnection,
      );
    },
  );
}
