import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that profile update properly records the updated_at timestamp.
 *
 * Verifies that after any successful profile modification (email, username, or
 * both), the updated_at field is set to the current timestamp reflecting the
 * modification time. This test ensures the system accurately tracks when user
 * profiles are modified for audit purposes and user awareness.
 *
 * Steps:
 *
 * 1. Update profile with new email to get first updated_at timestamp
 * 2. Wait a brief moment to ensure timestamp difference
 * 3. Update profile with different email again
 * 4. Verify the second updated_at timestamp is newer than the first
 * 5. Confirm timestamp reflects actual update time
 */
export async function test_api_profile_update_updates_timestamp(
  connection: api.IConnection,
) {
  // First profile update with initial email
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstUpdate = await api.functional.my.profile.update(connection, {
    body: {
      email: firstEmail,
    } satisfies IDiscussionBoardUser.IUpdate,
  });
  typia.assert(firstUpdate);
  const firstUpdatedAt = firstUpdate.updatedAt;

  // Wait to ensure timestamp difference (100ms)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Second profile update with different email
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondUpdate = await api.functional.my.profile.update(connection, {
    body: {
      email: secondEmail,
    } satisfies IDiscussionBoardUser.IUpdate,
  });
  typia.assert(secondUpdate);
  const secondUpdatedAt = secondUpdate.updatedAt;

  // Verify the updated_at timestamps are different
  TestValidator.notEquals(
    "updated_at should be different after second profile update",
    secondUpdatedAt,
    firstUpdatedAt,
  );

  // Verify the second updated_at is newer than the first
  const secondTimestamp = new Date(secondUpdatedAt);
  const firstTimestamp = new Date(firstUpdatedAt);
  TestValidator.predicate(
    "second updated_at should be newer than first updated_at",
    secondTimestamp > firstTimestamp,
  );

  // Verify the new email was actually updated
  TestValidator.equals(
    "email should match the second update value",
    secondUpdate.email,
    secondEmail,
  );
}
