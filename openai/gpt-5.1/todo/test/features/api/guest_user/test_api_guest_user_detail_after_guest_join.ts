import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

export async function test_api_guest_user_detail_after_guest_join(
  connection: api.IConnection,
) {
  // 1. Join as a guest user from an unauthenticated context
  const joinBody = {
    // Provide a stable display name to assert round-trip consistency
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppGuestUser.IJoin;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  // Capture fields from the authorized payload for later comparison
  const guestId = authorized.id;
  const joinDisplayName = authorized.display_name ?? null;
  const joinCreatedAt = authorized.created_at;
  const joinUpdatedAt = authorized.updated_at;
  const joinDeletedAt = authorized.deleted_at ?? null;

  // Sanity-check invariants on the authorized payload
  TestValidator.predicate("guest id is non-empty uuid", () => {
    return typeof guestId === "string" && guestId.length > 0;
  });
  TestValidator.predicate("guest created_at is non-empty", () => {
    return typeof joinCreatedAt === "string" && joinCreatedAt.length > 0;
  });
  TestValidator.predicate("guest updated_at is non-empty", () => {
    return typeof joinUpdatedAt === "string" && joinUpdatedAt.length > 0;
  });

  // 2. Call the detail endpoint for this guest user
  const detail1: ITodoAppGuestUser =
    await api.functional.todoApp.guestUser.guestUsers.at(connection, {
      guestUserId: guestId,
    });
  typia.assert<ITodoAppGuestUser>(detail1);

  // 3. Validate that detail matches the authorized payload
  TestValidator.equals("detail.id matches authorized.id", detail1.id, guestId);
  TestValidator.equals(
    "detail.created_at matches authorized.created_at",
    detail1.created_at,
    joinCreatedAt,
  );
  TestValidator.equals(
    "detail.updated_at matches authorized.updated_at",
    detail1.updated_at,
    joinUpdatedAt,
  );

  // deleted_at should mirror the join payload (typically null)
  TestValidator.equals(
    "detail.deleted_at matches authorized.deleted_at",
    detail1.deleted_at ?? null,
    joinDeletedAt,
  );

  // display_name round-trip: may be null/undefined or the provided value
  TestValidator.equals(
    "detail.display_name matches authorized.display_name",
    detail1.display_name ?? null,
    joinDisplayName,
  );

  // 4. Call the detail endpoint again to confirm read-only behavior
  const detail2: ITodoAppGuestUser =
    await api.functional.todoApp.guestUser.guestUsers.at(connection, {
      guestUserId: guestId,
    });
  typia.assert<ITodoAppGuestUser>(detail2);

  // 5. Compare first and second detail responses
  TestValidator.equals("second detail id is stable", detail2.id, detail1.id);
  TestValidator.equals(
    "second detail created_at is stable",
    detail2.created_at,
    detail1.created_at,
  );
  TestValidator.equals(
    "second detail deleted_at is stable",
    detail2.deleted_at ?? null,
    detail1.deleted_at ?? null,
  );

  // updated_at should never go backwards; allow equality or forward movement
  TestValidator.predicate("detail.updated_at is monotonic", () => {
    const first = new Date(detail1.updated_at).getTime();
    const second = new Date(detail2.updated_at).getTime();
    return second >= first;
  });
}
