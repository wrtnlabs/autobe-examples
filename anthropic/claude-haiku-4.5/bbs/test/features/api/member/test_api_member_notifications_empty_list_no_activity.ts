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
 * Validates that newly registered members without any activity receive an empty
 * notification list.
 *
 * A member who has just registered and has no prior activity (no comments, no
 * articles, no replies) should receive an empty notifications array when
 * querying the notifications endpoint. This test ensures that the API correctly
 * returns an empty paginated response for members with no notification-
 * triggering events.
 *
 * Test flow:
 *
 * 1. Register a new member account with valid email and password
 * 2. Call the notifications endpoint to retrieve the member's notifications
 * 3. Validate that the response contains an empty data array
 * 4. Validate that pagination metadata shows 0 total records
 * 5. Verify the operation completes successfully without errors
 */
export async function test_api_member_notifications_empty_list_no_activity(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123";

  const newMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(newMember);

  // Verify the member was created with proper authorization
  TestValidator.predicate(
    "member has valid ID",
    newMember.id !== undefined && newMember.id.length > 0,
  );
  TestValidator.predicate(
    "member has access token",
    newMember.token.access !== undefined && newMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "member has refresh token",
    newMember.token.refresh !== undefined && newMember.token.refresh.length > 0,
  );

  // Step 2: Retrieve notifications for the newly registered member
  const notificationResponse: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(notificationResponse);

  // Step 3: Validate empty notifications array
  TestValidator.equals(
    "notifications data array is empty",
    notificationResponse.data,
    [],
  );
  TestValidator.predicate(
    "notifications data is an array",
    Array.isArray(notificationResponse.data),
  );
  TestValidator.equals(
    "notifications array length is zero",
    notificationResponse.data.length,
    0,
  );

  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    notificationResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 0",
    notificationResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    "total records count is zero",
    notificationResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is zero",
    notificationResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    notificationResponse.pagination.limit >= 0,
  );

  // Step 5: Verify response structure integrity
  TestValidator.predicate(
    "response has pagination property",
    notificationResponse.pagination !== null &&
      notificationResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data property",
    Array.isArray(notificationResponse.data),
  );
}
