import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate minimal admin-created actor security event creation.
 *
 * Business goal: Ensure that an authenticated admin can create an actor
 * security event by providing only the required fields (actor_type and
 * event_type). The platform must successfully persist the event, generate
 * identifiers and timestamps, and gracefully handle omitted optional context
 * fields (ip, user_agent, metadata) by leaving them null/undefined instead of
 * rejecting the request.
 *
 * Steps:
 *
 * 1. Join an admin account via POST /auth/admin/join to obtain an authenticated
 *    admin context (SDK will wire Authorization header).
 * 2. Call POST /shoppingMall/admin/actorSecurityEvents with a body that only
 *    supplies actor_type and event_type, intentionally omitting ip, user_agent,
 *    and metadata.
 * 3. Assert that creation succeeds and returns a valid
 *    IShoppingMallActorSecurityEvent instance.
 * 4. Validate that id, created_at, and updated_at are non-null and correctly
 *    typed.
 * 5. Validate that actor_type and event_type echo the sent values.
 * 6. Validate that optional fields ip, user_agent, and metadata are either null or
 *    undefined, demonstrating that the system tolerates missing network/client
 *    context.
 */
export async function test_api_actor_security_event_creation_with_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Join an admin to establish authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip is intentionally omitted here to let server infer it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an actor security event with only required fields
  const actorType = "admin";
  const eventType = "LOGIN_FAILED";

  const createBody = {
    actor_type: actorType,
    event_type: eventType,
    // ip, user_agent, metadata are intentionally omitted
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const securityEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(securityEvent);

  // 3. Validate core identity and timestamps
  TestValidator.predicate(
    "security event id must be a non-empty string",
    typeof securityEvent.id === "string" && securityEvent.id.length > 0,
  );
  TestValidator.predicate(
    "security event created_at must be non-empty",
    typeof securityEvent.created_at === "string" &&
      securityEvent.created_at.length > 0,
  );
  TestValidator.predicate(
    "security event updated_at must be non-empty",
    typeof securityEvent.updated_at === "string" &&
      securityEvent.updated_at.length > 0,
  );

  // 4. Validate echo of required fields
  TestValidator.equals(
    "actor_type must echo the request value",
    securityEvent.actor_type,
    actorType,
  );
  TestValidator.equals(
    "event_type must echo the request value",
    securityEvent.event_type,
    eventType,
  );

  // 5. Validate optional fields behavior (null or undefined)
  TestValidator.predicate(
    "ip must be null or undefined when omitted",
    securityEvent.ip === null || securityEvent.ip === undefined,
  );
  TestValidator.predicate(
    "user_agent must be null or undefined when omitted",
    securityEvent.user_agent === null || securityEvent.user_agent === undefined,
  );
  TestValidator.predicate(
    "metadata must be null or undefined when omitted",
    securityEvent.metadata === null || securityEvent.metadata === undefined,
  );
}
