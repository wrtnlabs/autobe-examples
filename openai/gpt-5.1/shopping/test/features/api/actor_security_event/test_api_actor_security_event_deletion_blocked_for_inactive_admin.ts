import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Verify that actor security event deletion is blocked for an inactive admin
 * while still allowed for an active admin.
 *
 * Business context: Actor security events are sensitive audit artifacts. Even
 * if an administrator once had valid tokens, platform policy should prevent
 * them from deleting security events after their account has been suspended or
 * otherwise made ineligible. However, other active admins must still be able to
 * perform governance operations like cleanup or corrective deletion.
 *
 * Scenario steps:
 *
 * 1. Admin A joins the platform via POST /auth/admin/join, obtaining an
 *    IShoppingMallAdmin.IAuthorized payload and establishing Authorization
 *    headers on the shared connection.
 * 2. Using Admin A’s token, create a new actor security event via POST
 *    /shoppingMall/admin/actorSecurityEvents, capturing the returned
 *    IShoppingMallActorSecurityEvent.id as securityEventId.
 * 3. Mark Admin A as ineligible by calling PUT
 *    /shoppingMall/admin/admins/{adminId} with an IShoppingMallAdmin.IUpdate
 *    payload that changes the status field to a non-active value such as
 *    "suspended".
 * 4. Still using Admin A’s connection (which carries the old token), attempt to
 *    delete the actor security event using DELETE
 *    /shoppingMall/admin/actorSecurityEvents/{securityEventId}. The call must
 *    fail with an authorization/business error. We assert only that an error
 *    occurs using TestValidator.error, without checking specific HTTP status
 *    codes.
 * 5. Create Admin B via another POST /auth/admin/join. This overwrites the
 *    Authorization header on the shared connection with Admin B’s token.
 * 6. With Admin B (still active), call DELETE
 *    /shoppingMall/admin/actorSecurityEvents/{securityEventId} again. This time
 *    the operation should succeed without throwing.
 *
 * Assertions and validations:
 *
 * - Typia.assert on all non-void responses: IShoppingMallAdmin.IAuthorized (for
 *   joins) and IShoppingMallActorSecurityEvent (for creation), as well as
 *   IShoppingMallAdmin (for the admin update response).
 * - TestValidator.error ensures Admin A, once suspended, cannot delete actor
 *   security events even though an access token was previously issued.
 * - No status-code-specific checks; only the presence or absence of an error is
 *   validated for delete operations.
 */
export async function test_api_actor_security_event_deletion_blocked_for_inactive_admin(
  connection: api.IConnection,
) {
  // 1. Admin A joins the platform and becomes the current actor on this connection.
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAAuthorized);

  // 2. Admin A creates an actor security event to be deleted later.
  const eventCreateBody = {
    actor_type: "admin",
    event_type: "TEST_EVENT_BEFORE_SUSPENSION",
    ip: "127.0.0.1",
    user_agent: RandomGenerator.name(2),
    metadata: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: eventCreateBody,
      },
    );
  typia.assert<IShoppingMallActorSecurityEvent>(createdEvent);

  // 3. Suspend Admin A by updating their status via the admin update endpoint.
  const updatedAdminA: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: adminAAuthorized.id,
      body: {
        status: "suspended",
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  typia.assert<IShoppingMallAdmin>(updatedAdminA);
  TestValidator.equals(
    "admin A status should be updated to suspended",
    updatedAdminA.status,
    "suspended",
  );

  // 4. Try to erase the event with Admin A's now-suspended account.
  await TestValidator.error(
    "suspended admin cannot erase security event",
    async () => {
      await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
        connection,
        {
          securityEventId: createdEvent.id,
        },
      );
    },
  );

  // 5. Create Admin B, which overwrites the Authorization header on the same connection.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminBAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminBAuthorized);

  // 6. With Admin B active, the erase operation should now succeed.
  await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
    connection,
    {
      securityEventId: createdEvent.id,
    },
  );
}
