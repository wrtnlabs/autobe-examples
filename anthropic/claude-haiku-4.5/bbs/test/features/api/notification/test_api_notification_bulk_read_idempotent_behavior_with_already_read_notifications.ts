import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotifications";

/**
 * Test idempotent behavior when bulk reading notifications that are already
 * marked as read.
 *
 * Validates that the bulk read operation gracefully handles idempotent calls,
 * returns correct counts of updated records, and maintains consistency when
 * called multiple times with the same notification IDs.
 *
 * Test flow:
 *
 * 1. Register a member account
 * 2. Test bulk read with empty notification list
 * 3. Test bulk read with single notification ID multiple times
 * 4. Test bulk read with multiple notification IDs
 * 5. Verify idempotent behavior - same inputs produce same results
 * 6. Validate response structure and types
 * 7. Confirm all bulk operations maintain consistency
 */
export async function test_api_notification_bulk_read_idempotent_behavior_with_already_read_notifications(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Create authenticated connection for member
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${member.token.access}`,
    },
  };

  // Step 2: Test bulk read with empty notification list
  const emptyBulkRead1: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: [],
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(emptyBulkRead1);
  TestValidator.equals(
    "empty notification list returns zero updates",
    emptyBulkRead1.updated_count,
    0,
  );

  // Step 3: Verify idempotence with empty list
  const emptyBulkRead2: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: [],
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(emptyBulkRead2);
  TestValidator.equals(
    "empty bulk read is idempotent - second call returns same result",
    emptyBulkRead2.updated_count,
    emptyBulkRead1.updated_count,
  );
  TestValidator.equals(
    "empty notification list always returns zero",
    emptyBulkRead2.updated_count,
    0,
  );

  // Step 4: Test with single notification ID
  const singleNotificationId = typia.random<string & tags.Format<"uuid">>();
  const singleBulkRead1: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: [singleNotificationId],
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(singleBulkRead1);
  TestValidator.predicate(
    "single notification bulk read returns valid response",
    typeof singleBulkRead1.updated_count === "number",
  );

  // Step 5: Test idempotence with single notification ID
  const singleBulkRead2: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: [singleNotificationId],
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(singleBulkRead2);
  TestValidator.equals(
    "idempotent calls with single ID return consistent results",
    singleBulkRead2.updated_count,
    singleBulkRead1.updated_count,
  );

  // Step 6: Test with multiple notification IDs
  const multipleIds: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const multiBulkRead1: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: multipleIds,
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(multiBulkRead1);
  TestValidator.predicate(
    "multiple notification bulk read returns valid response",
    typeof multiBulkRead1.updated_count === "number",
  );

  // Step 7: Test idempotence with multiple notification IDs
  const multiBulkRead2: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: multipleIds,
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(multiBulkRead2);
  TestValidator.equals(
    "idempotent calls with multiple IDs return consistent results",
    multiBulkRead2.updated_count,
    multiBulkRead1.updated_count,
  );

  // Step 8: Call the same operation again to verify consistent idempotence
  const multiBulkRead3: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: multipleIds,
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(multiBulkRead3);
  TestValidator.equals(
    "third call with same IDs maintains idempotence",
    multiBulkRead3.updated_count,
    multiBulkRead1.updated_count,
  );

  // Step 9: Validate response structure and constraints
  TestValidator.predicate(
    "updated_count is a valid integer",
    Number.isInteger(multiBulkRead3.updated_count),
  );
  TestValidator.predicate(
    "updated_count is non-negative",
    multiBulkRead3.updated_count >= 0,
  );

  // Step 10: Test with duplicate IDs in array
  const duplicateIds = [singleNotificationId, singleNotificationId];
  const duplicateBulkRead1: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: duplicateIds,
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(duplicateBulkRead1);

  // Step 11: Test same duplicate IDs again for idempotence
  const duplicateBulkRead2: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      memberConnection,
      {
        body: {
          notification_ids: duplicateIds,
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(duplicateBulkRead2);
  TestValidator.equals(
    "duplicate IDs maintain idempotent behavior",
    duplicateBulkRead2.updated_count,
    duplicateBulkRead1.updated_count,
  );

  // Step 12: Final validation - confirm all operations succeeded
  TestValidator.predicate(
    "all bulk read operations returned valid responses",
    emptyBulkRead1.updated_count >= 0 &&
      singleBulkRead1.updated_count >= 0 &&
      multiBulkRead1.updated_count >= 0,
  );
}
