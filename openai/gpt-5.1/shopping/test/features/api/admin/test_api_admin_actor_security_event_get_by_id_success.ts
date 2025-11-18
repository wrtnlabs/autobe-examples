import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an authenticated admin can retrieve a specific actor security
 * event by its identifier and that the endpoint behaves as a pure read-only
 * detail fetch.
 *
 * Business workflow:
 *
 * 1. Register an administrator account using POST /auth/admin/join.
 *
 *    - This both creates the admin row and establishes an authenticated admin
 *         session.
 *    - The SDK automatically installs the access token into the connection headers,
 *         so no manual header manipulation is required (and must not be
 *         performed in the test).
 * 2. As this authenticated admin, create a concrete actor security event via POST
 *    /shoppingMall/admin/actorSecurityEvents.
 *
 *    - Use a payload that has clearly recognizable values for actor_type,
 *         event_type, ip, user_agent, and metadata so they can be verified
 *         later.
 * 3. Capture the id from the creation response.
 * 4. Call GET /shoppingMall/admin/actorSecurityEvents/{securityEventId} using the
 *    captured id.
 * 5. Assert that the response is a valid IShoppingMallActorSecurityEvent instance
 *    using typia.assert.
 * 6. Assert that all core fields (id, actor_type, event_type, ip, user_agent,
 *    metadata, created_at, updated_at, deleted_at) of the retrieved record
 *    match those from the creation response.
 * 7. Confirm the endpoint is read-only by verifying that created_at and updated_at
 *    have not changed and that deleted_at has not been altered.
 */
export async function test_api_admin_actor_security_event_get_by_id_success(
  connection: api.IConnection,
) {
  // 1. Register an administrator; this also authenticates the connection.
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

  // 2. Create a recognizable actor security event as this admin.
  const recognizableActorType = "admin";
  const recognizableEventType = "LOGIN_FAILED";
  const recognizableIp = "192.0.2.10";
  const recognizableUserAgent = "E2E-Test-Agent/1.0";
  const recognizableMetadata = '{"reason":"invalid_credentials","e2e":true}';

  const createBody = {
    actor_type: recognizableActorType,
    event_type: recognizableEventType,
    ip: recognizableIp,
    user_agent: recognizableUserAgent,
    metadata: recognizableMetadata,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdEvent);

  // 3. Retrieve the event by its id via the detail endpoint.
  const fetchedEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.at(connection, {
      securityEventId: createdEvent.id,
    });
  typia.assert(fetchedEvent);

  // 4. Validate core identity and content fields equality between create and get.
  TestValidator.equals(
    "security event id should match between create and get",
    fetchedEvent.id,
    createdEvent.id,
  );

  TestValidator.equals(
    "actor_type should be preserved between create and get",
    fetchedEvent.actor_type,
    createdEvent.actor_type,
  );

  TestValidator.equals(
    "event_type should be preserved between create and get",
    fetchedEvent.event_type,
    createdEvent.event_type,
  );

  TestValidator.equals(
    "ip should be preserved between create and get",
    fetchedEvent.ip ?? null,
    createdEvent.ip ?? null,
  );

  TestValidator.equals(
    "user_agent should be preserved between create and get",
    fetchedEvent.user_agent ?? null,
    createdEvent.user_agent ?? null,
  );

  TestValidator.equals(
    "metadata should be preserved between create and get",
    fetchedEvent.metadata ?? null,
    createdEvent.metadata ?? null,
  );

  TestValidator.equals(
    "created_at should not change between create and get (read-only)",
    fetchedEvent.created_at,
    createdEvent.created_at,
  );

  TestValidator.equals(
    "updated_at should not change between create and get (read-only)",
    fetchedEvent.updated_at,
    createdEvent.updated_at,
  );

  TestValidator.equals(
    "deleted_at should be identical between create and get (read-only)",
    fetchedEvent.deleted_at ?? null,
    createdEvent.deleted_at ?? null,
  );
}
