import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that only admin-authenticated callers can retrieve actor security
 * events by ID.
 *
 * Business goal:
 *
 * - Ensure that GET /shoppingMall/admin/actorSecurityEvents/{securityEventId} is
 *   protected behind admin authorization and cannot be accessed anonymously.
 *
 * Scenario:
 *
 * 1. Join an admin account using POST /auth/admin/join, which also sets the
 *    Authorization header on the provided connection with the admin access
 *    token.
 * 2. Create a new actor security event using POST
 *    /shoppingMall/admin/actorSecurityEvents and capture its ID.
 * 3. Clone the connection into an unauthenticated variant with empty headers and
 *    verify that accessing the event by ID without credentials fails.
 * 4. Use the authenticated admin connection to successfully retrieve the same
 *    event by ID and verify that it matches the created record.
 */
export async function test_api_admin_actor_security_event_get_access_control_requires_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization token (automatically set on connection)
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a security event as admin
  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: typia.random<IShoppingMallActorSecurityEvent.ICreate>(),
      },
    );
  typia.assert<IShoppingMallActorSecurityEvent>(createdEvent);

  // 3. Prepare unauthenticated connection by cloning and clearing headers
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 4. Unauthenticated access must fail
  await TestValidator.error(
    "unauthenticated must not access admin security event",
    async () => {
      await api.functional.shoppingMall.admin.actorSecurityEvents.at(
        unauthenticated,
        {
          securityEventId: createdEvent.id,
        },
      );
    },
  );

  // 5. Authenticated admin access must succeed
  const fetched: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.at(connection, {
      securityEventId: createdEvent.id,
    });
  typia.assert<IShoppingMallActorSecurityEvent>(fetched);

  // Verify that we retrieved the same event
  TestValidator.equals(
    "fetched security event id must match created id",
    fetched.id,
    createdEvent.id,
  );
}
