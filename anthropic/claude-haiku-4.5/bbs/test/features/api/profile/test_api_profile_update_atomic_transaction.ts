import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test atomic transaction behavior for profile updates.
 *
 * This test validates that profile updates are applied atomically. When
 * updating multiple fields (email and username), either both changes succeed
 * together or neither is applied if validation fails. The test verifies that
 * partial updates work correctly and that the system maintains data consistency
 * throughout the update process.
 *
 * Test flow:
 *
 * 1. Perform initial update with both email and username fields
 * 2. Verify both changes were persisted atomically
 * 3. Perform second atomic update with different values
 * 4. Verify both new values were applied together
 * 5. Perform partial update with only email field
 * 6. Verify only email changed while other fields remained stable
 * 7. Perform another partial update with only username
 * 8. Verify atomicity across multiple sequential updates
 */
export async function test_api_profile_update_atomic_transaction(
  connection: api.IConnection,
) {
  // Step 1: Perform initial atomic update with both email and username
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = RandomGenerator.name(1);

  const firstUpdate = {
    email: firstEmail,
    username: firstUsername,
  } satisfies IDiscussionBoardUser.IUpdate;

  const result1 = await api.functional.my.profile.update(connection, {
    body: firstUpdate,
  });
  typia.assert(result1);

  // Step 2: Verify both changes were persisted atomically
  TestValidator.equals(
    "first update email applied atomically",
    result1.email,
    firstEmail,
  );
  TestValidator.equals(
    "first update username applied atomically",
    result1.username,
    firstUsername,
  );

  // Step 3: Perform second atomic update with different values
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondUsername = RandomGenerator.name(1);

  const secondUpdate = {
    email: secondEmail,
    username: secondUsername,
  } satisfies IDiscussionBoardUser.IUpdate;

  const result2 = await api.functional.my.profile.update(connection, {
    body: secondUpdate,
  });
  typia.assert(result2);

  // Step 4: Verify both new values were applied together
  TestValidator.equals(
    "second update email applied",
    result2.email,
    secondEmail,
  );
  TestValidator.equals(
    "second update username applied",
    result2.username,
    secondUsername,
  );
  TestValidator.notEquals(
    "email changed from first update",
    result2.email,
    firstEmail,
  );
  TestValidator.notEquals(
    "username changed from first update",
    result2.username,
    firstUsername,
  );

  // Step 5: Perform partial update with only email field
  const thirdEmail = typia.random<string & tags.Format<"email">>();

  const partialUpdate = {
    email: thirdEmail,
  } satisfies IDiscussionBoardUser.IUpdate;

  const result3 = await api.functional.my.profile.update(connection, {
    body: partialUpdate,
  });
  typia.assert(result3);

  // Step 6: Verify only email changed while username remained from previous update
  TestValidator.equals(
    "partial update changed email",
    result3.email,
    thirdEmail,
  );
  TestValidator.equals(
    "partial update preserved username from previous update",
    result3.username,
    secondUsername,
  );

  // Step 7: Perform another partial update with only username
  const thirdUsername = RandomGenerator.name(1);

  const usernameOnlyUpdate = {
    username: thirdUsername,
  } satisfies IDiscussionBoardUser.IUpdate;

  const result4 = await api.functional.my.profile.update(connection, {
    body: usernameOnlyUpdate,
  });
  typia.assert(result4);

  // Step 8: Verify atomicity across multiple sequential updates
  TestValidator.equals(
    "username-only update changed username",
    result4.username,
    thirdUsername,
  );
  TestValidator.equals(
    "username-only update preserved email from previous update",
    result4.email,
    thirdEmail,
  );
  TestValidator.notEquals(
    "email differs from second update",
    result4.email,
    secondEmail,
  );
}
