import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

export async function test_api_guest_user_identity_partial_update_status_only(
  connection: api.IConnection,
) {
  // 1. Establish a guest identity and session via join
  const joinRequestBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: "203.0.113." + RandomGenerator.alphaNumeric(2),
    href: "https://example.com/landing", // must be URI per tags.Format<"uri">
    referrer: "https://example.com/referrer",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  const baselineGuest: ITodoAppGuestUser.ISummary = authorized.guest;
  const originalStatus: string = baselineGuest.status;
  const baselineExternalReference = baselineGuest.external_reference ?? null;
  const baselineDisplayName = baselineGuest.display_name ?? null;
  const baselineCreatedAt: string = baselineGuest.created_at;
  const baselineUpdatedAt: string = baselineGuest.updated_at;

  // 2. Choose a new status different from the original
  const newStatus: string = originalStatus === "active" ? "archived" : "active";

  // 3. Build status-only update payload
  const updateBody = {
    status: newStatus,
  } satisfies ITodoAppGuestUser.IUpdate;

  // 4. Call update endpoint with path param and body
  const updated: ITodoAppGuestUser =
    await api.functional.todoApp.guestUser.guestUsers.update(connection, {
      guestUserId: baselineGuest.id,
      body: updateBody,
    });
  typia.assert<ITodoAppGuestUser>(updated);

  // 5. Validate invariants
  // id remains the same
  TestValidator.equals(
    "guest id should remain unchanged after status-only update",
    updated.id,
    baselineGuest.id,
  );

  // status should be updated and different from the original
  TestValidator.equals(
    "guest status should be updated to newStatus",
    updated.status,
    newStatus,
  );
  TestValidator.notEquals(
    "guest status should differ from original status",
    updated.status,
    originalStatus,
  );

  // external_reference should remain unchanged (including nullability)
  TestValidator.equals(
    "external_reference should remain unchanged after status-only update",
    updated.external_reference ?? null,
    baselineExternalReference,
  );

  // display_name should remain unchanged (including nullability)
  TestValidator.equals(
    "display_name should remain unchanged after status-only update",
    updated.display_name ?? null,
    baselineDisplayName,
  );

  // created_at should remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged after status-only update",
    updated.created_at,
    baselineCreatedAt,
  );

  // updated_at should change and be >= previous updated_at
  TestValidator.notEquals(
    "updated_at should change after status-only update",
    updated.updated_at,
    baselineUpdatedAt,
  );

  const baselineUpdatedAtMs = new Date(baselineUpdatedAt).getTime();
  const updatedAtMs = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be greater than or equal to previous updated_at",
    updatedAtMs >= baselineUpdatedAtMs,
  );

  // Sanity check: new status is non-empty string to ensure usability in downstream logic
  TestValidator.predicate(
    "new status string should be non-empty",
    newStatus.length > 0,
  );
}
