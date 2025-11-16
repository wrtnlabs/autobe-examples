import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate retrieval and stability of notification preferences right after
 * admin registration and a typical admin operation.
 *
 * Business purpose:
 *
 * - Ensure that once an admin user has joined and is authenticated, the GET
 *   /discussionBoard/adminUser/notifications/adminUser/preferences endpoint
 *   returns a valid notification preference record bound to that admin
 *   context.
 * - Confirm basic stability by calling the preferences endpoint twice and
 *   asserting that core identity fields (id) remain stable across calls when no
 *   update APIs are invoked.
 *
 * Steps:
 *
 * 1. Register (join) a new admin user via POST /auth/adminUser/join, using a
 *    random but valid IDiscussionBoardAdminUserJoin.IRequest payload.
 *
 *    - Assert that the response conforms to IDiscussionBoardAdminuser.IAuthorized.
 *    - Rely on the SDK to propagate the Authorization header; do not manipulate
 *         connection.headers directly.
 * 2. Perform a typical admin-only operation to ensure the admin context is fully
 *    usable: create an article category using POST
 *    /discussionBoard/adminUser/articleCategories.
 *
 *    - Build a random IDiscussionBoardArticleCategory.ICreate body with
 *         typia.random.
 *    - Assert the response as IDiscussionBoardArticleCategory.
 * 3. First retrieval of notification preferences:
 *
 *    - Call GET /discussionBoard/adminUser/notifications/adminUser/preferences via
 *         api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at.
 *    - Assert the response as IDiscussionBoardAdminuserNotificationPreference.
 * 4. Second retrieval of notification preferences:
 *
 *    - Call the same preferences.at function again with the same connection, still
 *         under the same authenticated admin.
 *    - Assert the response type.
 * 5. Validate business invariants:
 *
 *    - Use TestValidator.equals to ensure the `id` of the preference is identical
 *         between the first and second retrieval, demonstrating stability for
 *         the same admin user when no update has occurred.
 *    - Optionally, compare the whole DTO structures to ensure that preference flags
 *         and timestamps are stable between calls (within this flow, there is
 *         no update, so equality is expected).
 *    - Do not perform any type-error or HTTP-status-specific tests; rely on the SDK
 *         throwing on failure and typia.assert for structural validation.
 */
export async function test_api_admin_notification_preferences_retrieval_after_registration(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (join) and establish authenticated context
  const joinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorized);

  // 2. Perform a typical admin-only operation: create an article category
  const categoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();

  const createdCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(createdCategory);

  // 3. First retrieval of notification preferences for the authenticated admin
  const firstPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at(
      connection,
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(
    firstPreference,
  );

  // Basic sanity checks on first preference
  TestValidator.predicate(
    "preference id should be a non-empty string",
    firstPreference.id.length > 0,
  );

  // 4. Second retrieval of notification preferences for the same admin
  const secondPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at(
      connection,
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(
    secondPreference,
  );

  // 5. Validate invariants: id and overall structure stability between calls
  TestValidator.equals(
    "preference id should remain stable across multiple reads",
    firstPreference.id,
    secondPreference.id,
  );

  TestValidator.equals(
    "entire preference object should remain stable without updates",
    firstPreference,
    secondPreference,
  );
}
