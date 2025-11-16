import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test notification deletion with invalid UUID format.
 *
 * NOTE: This test scenario cannot be implemented as originally specified. The
 * scenario requests testing with an invalid UUID format, which would require
 * deliberately bypassing TypeScript's type system using forbidden patterns like
 * type assertions (as any, as string & tags.Format<"uuid">).
 *
 * Per the testing guidelines:
 *
 * - Type validation is the responsibility of the framework, not E2E tests
 * - Deliberately creating type errors is absolutely forbidden
 * - Tests must focus on business logic with correct types
 *
 * The API function signature requires `string & tags.Format<"uuid">` for the
 * notificationId parameter, which means TypeScript enforces UUID format at
 * compile time. There is no valid way to test invalid UUID format without
 * violating type safety rules.
 *
 * Alternative implementation: Test successful notification deletion with valid
 * UUID (business logic) instead of type validation.
 */
export async function test_api_notification_deletion_invalid_uuid(
  connection: api.IConnection,
) {
  // Authenticate as a member
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Test deletion attempt with non-existent but valid UUID format
  // This tests business logic (notification not found) rather than type validation
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should fail when deleting non-existent notification",
    async () => {
      await api.functional.redditCommunity.member.notifications.erase(
        connection,
        {
          notificationId: nonExistentNotificationId,
        },
      );
    },
  );
}
