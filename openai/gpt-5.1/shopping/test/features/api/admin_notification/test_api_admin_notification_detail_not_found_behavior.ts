import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Verify not-found behavior of admin notification detail endpoint.
 *
 * Business goal: Ensure that GET
 * /shoppingMall/admin/adminNotifications/{adminNotificationId} behaves
 * correctly when the caller is a legitimately authenticated admin but the
 * requested notification ID does not exist. The endpoint must respond with an
 * HTTP not-found error (404-class) without leaking internal details, while
 * still working normally for valid IDs.
 *
 * Scenario steps:
 *
 * 1. Join as an admin using POST /auth/admin/join so that subsequent
 *    /shoppingMall/admin/* calls run under an authenticated admin context.
 * 2. Optionally create a valid admin notification via POST
 *    /shoppingMall/admin/adminNotifications and verify that a normal GET-by-id
 *    call succeeds. This serves as a sanity check that the detail endpoint
 *    works for existing records.
 * 3. Generate a random UUID to be used as a definitely-nonexistent
 *    adminNotificationId. To reduce collision risk, also assert that the
 *    randomly chosen ID is not equal to the ID of the notification we just
 *    created in step 2.
 * 4. Call GET /shoppingMall/admin/adminNotifications/{adminNotificationId} with
 *    that non-existent ID.
 * 5. Assert that the SDK throws an HttpError with a 404 status using
 *    TestValidator.httpError. Do not attempt to parse or assert the error body
 *    payload shape beyond that.
 *
 * This test focuses purely on business-level not-found behavior; it avoids any
 * type-mismatch scenarios and never manipulates connection.headers directly,
 * relying instead on the SDK's token handling from the join call.
 */
export async function test_api_admin_notification_detail_not_found_behavior(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin using join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a valid admin notification as a sanity-check record
  const baseAdminId = adminAuthorized.id;

  const createBody = {
    shopping_mall_admin_id: baseAdminId,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "test_not_found_behavior",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    status: "unread",
    priority: "low",
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const createdNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(createdNotification);

  // Sanity-check: existing notification can be retrieved by ID
  const fetchedExisting: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.at(connection, {
      adminNotificationId: createdNotification.id,
    });
  typia.assert<IShoppingMallAdminNotification>(fetchedExisting);
  TestValidator.equals(
    "detail endpoint returns the created notification for existing id",
    fetchedExisting.id,
    createdNotification.id,
  );

  // 3. Generate a non-existent UUID distinct from the created notification id
  let nonExistingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistingId === createdNotification.id) {
    // Extremely unlikely, but regenerate once if collision occurs
    nonExistingId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "non-existing id must differ from created notification id",
    nonExistingId,
    createdNotification.id,
  );

  // 4-5. Call detail endpoint with non-existent id and expect 404 HttpError
  await TestValidator.httpError(
    "admin notification detail with non-existent id should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.at(
        connection,
        {
          adminNotificationId: nonExistingId,
        },
      );
    },
  );
}
