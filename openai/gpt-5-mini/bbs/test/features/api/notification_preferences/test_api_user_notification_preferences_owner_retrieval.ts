import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Validate retrieval of a registered user's notification preferences by the
 * owner.
 *
 * Business context:
 *
 * - Registered users can control delivery channels (in_app, email, push) and
 *   per-type overrides via preferences_payload (a serialized JSON string).
 * - Only the owning registered user (or an administrator) may retrieve these
 *   preferences. This test verifies owner retrieval and that unauthenticated or
 *   different-user access is rejected.
 *
 * Steps:
 *
 * 1. Register a new user via POST /auth/registeredUser/join.
 * 2. Update that user's notification preferences via PUT
 *    .../notificationPreferences.
 * 3. Retrieve the preferences via GET .../notificationPreferences and assert the
 *    returned record matches the persisted values.
 * 4. Negative tests: unauthenticated access and other-user access must fail.
 *
 * Notes:
 *
 * - Use only the provided SDK functions. Do not manipulate connection.headers
 *   directly. Use `satisfies` for request body typing and typia.assert() for
 *   response validation.
 */
export async function test_api_user_notification_preferences_owner_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new user (owner)
  const ownerJoinBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd1234",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: ownerJoinBody,
    });
  // Validate authorized response and that we have an id + token
  typia.assert(owner);
  TestValidator.predicate(
    "owner has id",
    typeof owner.id === "string" && owner.id.length > 0,
  );
  TestValidator.predicate(
    "owner token present",
    typeof owner.token?.access === "string" && owner.token.access.length > 0,
  );

  // 2. Prepare and perform preferences update using the authenticated connection
  const prefsPayloadObject = {
    mentions: { email: false },
    digest: { email: false },
  };
  const updateBody = {
    in_app: true,
    email: false,
    push: true,
    preferences_payload: JSON.stringify(prefsPayloadObject),
  } satisfies IEconPoliticalForumNotificationPreferences.IUpdate;

  const updated: IEconPoliticalForumNotificationPreferences =
    await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.update(
      connection,
      {
        userId: owner.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Business assertions for update response
  TestValidator.equals(
    "updated registereduser_id matches owner id",
    updated.registereduser_id,
    owner.id,
  );
  TestValidator.equals("updated in_app", updated.in_app, updateBody.in_app);
  TestValidator.equals("updated email", updated.email, updateBody.email);
  TestValidator.equals("updated push", updated.push, updateBody.push);
  TestValidator.equals(
    "updated preferences_payload stored",
    updated.preferences_payload,
    updateBody.preferences_payload,
  );

  // 3. Retrieve preferences as the owner
  const retrieved: IEconPoliticalForumNotificationPreferences =
    await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.atNotificationPreferences(
      connection,
      {
        userId: owner.id,
      },
    );
  typia.assert(retrieved);

  // Verify retrieval matches updated values
  TestValidator.equals(
    "retrieved registereduser_id matches owner",
    retrieved.registereduser_id,
    owner.id,
  );
  TestValidator.equals("retrieved in_app", retrieved.in_app, updateBody.in_app);
  TestValidator.equals("retrieved email", retrieved.email, updateBody.email);
  TestValidator.equals("retrieved push", retrieved.push, updateBody.push);
  TestValidator.equals(
    "retrieved preferences_payload",
    retrieved.preferences_payload,
    updateBody.preferences_payload,
  );

  // 4a. Negative: unauthenticated access should fail (no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve another user's preferences",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.atNotificationPreferences(
        unauthConn,
        { userId: owner.id },
      );
    },
  );

  // 4b. Negative: another authenticated user must not retrieve owner's preferences
  const otherJoinBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd1234",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  // Use a separate connection object for the second user so its session
  // doesn't overwrite the original `connection` authentication header.
  const otherConn: api.IConnection = { ...connection, headers: {} };

  const otherUser: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(otherConn, {
      body: otherJoinBody,
    });
  typia.assert(otherUser);

  await TestValidator.error(
    "other authenticated user cannot retrieve owner's preferences",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.atNotificationPreferences(
        otherConn,
        { userId: owner.id },
      );
    },
  );

  // Additional DB-level expectations (expressed via returned DTO checks):
  // - The preferences row should reference the owner id (already asserted above)
  // - updated.updated_at should be present and be a date-time string
  TestValidator.predicate(
    "updated_at exists and is ISO date-time",
    typeof updated.updated_at === "string" && updated.updated_at.length > 0,
  );

  // Teardown / cleanup note: Test runner should roll back or reset DB between
  // tests. If explicit deletion endpoints exist, call them here. For this test
  // we rely on test isolation provided by the environment.
}
