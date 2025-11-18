import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate deletion of a seller-related actor security event by an admin.
 *
 * Business purpose:
 *
 * - Ensure that an admin can create an actor security event for a seller actor
 *   and then successfully delete it using the dedicated erase endpoint.
 * - Demonstrate that the erase endpoint behaves consistently regardless of
 *   actor_type but is exercised here with actor_type="seller".
 * - Confirm that once an event has been erased, subsequent deletion attempts for
 *   the same identifier fail, reflecting that the record no longer exists (or
 *   is otherwise protected from repeated deletion).
 *
 * Scenario steps:
 *
 * 1. Join as an admin via POST /auth/admin/join. This also establishes
 *    Authorization headers on the connection for subsequent admin-only calls.
 * 2. Create an actor security event via POST
 *    /shoppingMall/admin/actorSecurityEvents with actor_type="seller" and a
 *    concrete event_type such as "PASSWORD_RESET_REQUESTED". Capture the
 *    returned event and its id.
 * 3. Delete the created event via DELETE
 *    /shoppingMall/admin/actorSecurityEvents/{securityEventId} using the id
 *    from step 2.
 * 4. Attempt to delete the same securityEventId again and expect an error, proving
 *    that the first deletion took effect.
 *
 * Validation points:
 *
 * - The admin join response conforms to IShoppingMallAdmin.IAuthorized.
 * - The created security event conforms to IShoppingMallActorSecurityEvent and
 *   echoes core request fields: actor_type="seller" and the chosen event_type.
 * - The first erase call completes without throwing.
 * - The second erase call results in an error, validated using
 *   TestValidator.error.
 */
export async function test_api_actor_security_event_deletion_for_seller_related_event(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authenticated admin context.
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
  typia.assert(adminAuthorized);

  // 2. Create a seller-related actor security event.
  const eventType = "PASSWORD_RESET_REQUESTED";
  const createBody = {
    actor_type: "seller",
    event_type: eventType,
    ip: RandomGenerator.mobile(),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
    metadata: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdEvent);

  // Basic field consistency checks.
  TestValidator.equals(
    "created event actor_type must be 'seller'",
    createdEvent.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "created event event_type must reflect request",
    createdEvent.event_type,
    createBody.event_type,
  );
  TestValidator.predicate(
    "created event id must be a non-empty string",
    createdEvent.id.length > 0,
  );

  // 3. Erase the created security event by its id.
  await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
    connection,
    {
      securityEventId: createdEvent.id,
    },
  );

  // 4. Second erase attempt should fail because the event is already deleted.
  await TestValidator.error("second erase on same id must fail", async () => {
    await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
      connection,
      {
        securityEventId: createdEvent.id,
      },
    );
  });
}
