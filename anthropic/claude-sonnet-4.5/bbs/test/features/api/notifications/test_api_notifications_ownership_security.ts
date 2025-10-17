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
 * Test strict ownership validation ensuring users can only access their own
 * notification data.
 *
 * This test creates two separate member accounts to validate cross-user
 * notification access controls. It verifies that the system enforces ownership
 * validation and prevents unauthorized access to other users' notifications
 * with a 403 Forbidden error. The test also confirms that legitimate access to
 * one's own notifications works correctly.
 *
 * Test workflow:
 *
 * 1. Create first member account (userA)
 * 2. Create second member account (userB) using separate connection
 * 3. Authenticate as userA and attempt to retrieve userB's notifications (should
 *    fail)
 * 4. Authenticate as userB and successfully retrieve own notifications
 */
export async function test_api_notifications_ownership_security(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (userA)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const userAData = {
    username: RandomGenerator.alphaNumeric(10),
    email: userAEmail,
    password: userAPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const userA = await api.functional.auth.member.join(connection, {
    body: userAData,
  });
  typia.assert(userA);

  // Step 2: Create second member account (userB) using separate connection to avoid auth conflict
  const userBConnection = {
    ...connection,
    headers: {},
  } satisfies api.IConnection;
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const userBData = {
    username: RandomGenerator.alphaNumeric(10),
    email: userBEmail,
    password: userBPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const userB = await api.functional.auth.member.join(userBConnection, {
    body: userBData,
  });
  typia.assert(userB);

  // Step 3: Attempt to retrieve notifications for userB while authenticated as userA (should fail)
  await TestValidator.error(
    "userA cannot access userB's notifications",
    async () => {
      await api.functional.discussionBoard.member.users.notifications.index(
        connection,
        {
          userId: userB.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardNotification.IRequest,
        },
      );
    },
  );

  // Step 4: Successfully retrieve userB's own notifications (already authenticated as userB)
  const userBNotifications =
    await api.functional.discussionBoard.member.users.notifications.index(
      userBConnection,
      {
        userId: userB.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(userBNotifications);

  // Verify the response structure
  TestValidator.predicate(
    "notification page has valid pagination",
    userBNotifications.pagination.current === 1,
  );
}
