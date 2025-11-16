import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform-admin-driven creation of a guest user with full tracking
 * context.
 *
 * ## Business purpose
 *
 * This test ensures that a platform administrator can persist a guest user
 * record in `shopping_mall_guestuser` with both required and optional
 * tracking-related fields. In particular, it verifies that:
 *
 * - An authenticated platform admin session (via /auth/platformAdmin/join) can
 *   call POST /shoppingMall/platformAdmin/guestUsers successfully.
 * - The requested tracking fields `temporary_identifier` and `user_agent` are
 *   stored and returned exactly as submitted.
 * - System-managed audit timestamps `created_at` and `updated_at` are populated
 *   as valid ISO 8601 date-time strings.
 * - The soft-deletion column `deleted_at` is not set for a fresh record (i.e.,
 *   remains null or undefined).
 *
 * ## High-level steps
 *
 * 1. Register and authenticate a platform administrator using
 *    `api.functional.auth.platformAdmin.join`, providing realistic registration
 *    and session context data.
 * 2. Using the now-authenticated connection (Authorization header is handled by
 *    the SDK), call
 *    `api.functional.shoppingMall.platformAdmin.guestUsers.create` with an
 *    `IShoppingMallGuestUser.ICreate` body that includes:
 *
 *    - `temporary_identifier`: opaque, cookie-like token value.
 *    - `user_agent`: a realistic browser User-Agent string.
 * 3. Validate the create response as `IShoppingMallGuestUser` and assert:
 *
 *    - `id` is a valid UUID (covered by typia.assert).
 *    - `temporary_identifier` and `user_agent` exactly match the submitted values.
 *    - `created_at` and `updated_at` are valid ISO date-time strings (covered by
 *         typia.assert), and `updated_at` is not earlier than `created_at`.
 *    - `deleted_at` is either `null` or `undefined`.
 *
 * ## Notes
 *
 * - The original scenario mentioned a follow-up GET by guest user ID, but such an
 *   API is not provided in the SDK materials, so this test treats the create
 *   response as the source of truth for persisted values.
 * - All request bodies use `satisfies` with the correct DTO types to preserve
 *   full type safety without any `as` casts.
 */
export async function test_api_platform_admin_guest_user_creation_with_full_tracking_context(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator so that the
  //    connection gains an Authorization header via the SDK's join logic.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. As the authenticated platform admin, create a guest user with full
  //    tracking context.
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  } satisfies IShoppingMallGuestUser.ICreate;

  const createdGuest =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert<IShoppingMallGuestUser>(createdGuest);

  // 3. Validate that core tracking fields and audit fields behave as
  //    expected for a newly created guest user.

  // Tracking fields must be returned exactly as submitted.
  TestValidator.equals(
    "guest temporary_identifier must match input",
    createdGuest.temporary_identifier,
    guestCreateBody.temporary_identifier,
  );

  TestValidator.equals(
    "guest user_agent must match input",
    createdGuest.user_agent,
    guestCreateBody.user_agent,
  );

  // created_at and updated_at are already validated by typia.assert as
  // date-time strings; we additionally ensure updated_at is not earlier
  // than created_at as a basic lifecycle sanity check.
  const createdAt = new Date(createdGuest.created_at).getTime();
  const updatedAt = new Date(createdGuest.updated_at).getTime();

  await TestValidator.predicate(
    "guest updated_at must be greater than or equal to created_at",
    async () => updatedAt >= createdAt,
  );

  // deleted_at must not be set for a fresh record.
  await TestValidator.predicate(
    "guest deleted_at must be null or undefined on creation",
    async () =>
      createdGuest.deleted_at === null || createdGuest.deleted_at === undefined,
  );
}
