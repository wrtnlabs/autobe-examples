import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProductReviewModerationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewModerationEvent";

/**
 * Validate error handling when requesting moderation events with non-existent
 * identifiers.
 *
 * Business purpose:
 *
 * - Ensure that the platform-admin-only moderation event detail endpoint does not
 *   succeed when given syntactically valid but non-existent UUIDs for both the
 *   review and the moderation event.
 * - Exercise the endpoint with two different invalid combinations to simulate the
 *   scenario where either the review or the moderation event (or both) are
 *   missing, while respecting global constraints (no status code assertions, no
 *   type-error-based tests, and only using available APIs).
 *
 * High-level steps:
 *
 * 1. Join as a platform admin using /auth/platformAdmin/join to establish an
 *    authenticated admin session.
 * 2. Generate random UUIDs that are extremely unlikely to correspond to any
 *    existing review or moderation event.
 * 3. Call the moderation event detail endpoint with one pair of non-existent IDs
 *    and assert that an error is thrown.
 * 4. Call the same endpoint again with the (conceptually) same reviewId but a
 *    different non-existent moderationEventId and assert that an error is
 *    thrown again.
 */
export async function test_api_platformadmin_review_moderation_event_for_nonexistent_ids(
  connection: api.IConnection,
) {
  // 1. Establish a platform admin session via join()
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "1234",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Prepare clearly non-existent but syntactically valid UUIDs.
  const missingReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const missingEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const anotherMissingEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Scenario A: Non-existent reviewId and moderationEventId.
  await TestValidator.error(
    "moderation event lookup with non-existent review and event should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.at(
        connection,
        {
          reviewId: missingReviewId,
          moderationEventId: missingEventId,
        },
      );
    },
  );

  // 4. Scenario B: (Conceptually) same reviewId but different non-existent moderationEventId.
  await TestValidator.error(
    "moderation event lookup with different non-existent moderationEventId should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.at(
        connection,
        {
          reviewId: missingReviewId,
          moderationEventId: anotherMissingEventId,
        },
      );
    },
  );
}
