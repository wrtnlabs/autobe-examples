import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

export async function test_api_guest_user_identity_update_basic_profile(
  connection: api.IConnection,
) {
  // 1. Establish guest user via auth.guestUser.join
  const joinRequestBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  const originalGuest = authorized.guest;
  typia.assert<ITodoAppGuestUser.ISummary>(originalGuest);

  // 2. Prepare update payload for minimal profile fields
  const newExternalReference = RandomGenerator.alphaNumeric(20);
  const newDisplayName = RandomGenerator.name(3);
  const newStatus = "active";

  const updateBody = {
    external_reference: newExternalReference,
    display_name: newDisplayName,
    status: newStatus,
  } satisfies ITodoAppGuestUser.IUpdate;

  // 3. Perform the update using todoApp.guestUser.guestUsers.update
  const updated: ITodoAppGuestUser =
    await api.functional.todoApp.guestUser.guestUsers.update(connection, {
      guestUserId: originalGuest.id,
      body: updateBody,
    });
  typia.assert<ITodoAppGuestUser>(updated);

  // 4. Business validations: identity invariants and profile field updates
  TestValidator.equals(
    "guest id remains stable after update",
    updated.id,
    originalGuest.id,
  );

  TestValidator.equals(
    "created_at is preserved and unchanged",
    updated.created_at,
    originalGuest.created_at,
  );

  // Compare updated_at timestamps: should not go backwards, typically increase
  const previousUpdatedAtMillis = Date.parse(originalGuest.updated_at);
  const currentUpdatedAtMillis = Date.parse(updated.updated_at);

  TestValidator.predicate(
    "updated_at is not before previous updated_at",
    () => currentUpdatedAtMillis >= previousUpdatedAtMillis,
  );

  TestValidator.equals(
    "external_reference field is updated to new value",
    updated.external_reference,
    newExternalReference,
  );

  TestValidator.equals(
    "display_name field is updated to new value",
    updated.display_name,
    newDisplayName,
  );

  TestValidator.equals(
    "status field is updated to requested value",
    updated.status,
    newStatus,
  );
}
