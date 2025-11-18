import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an authenticated admin can manually record a customer login
 * failure security event.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join, which also establishes an
 *    authenticated admin context by wiring the issued JWT access token into the
 *    shared connection headers.
 * 2. With that authenticated admin, call POST
 *    /shoppingMall/admin/actorSecurityEvents to create a security event
 *    describing a failed customer login attempt (actor_type="customer",
 *    event_type="LOGIN_FAILED").
 * 3. Assert that the response is a fully-populated IShoppingMallActorSecurityEvent
 *    record, including server-managed identifiers and timestamps.
 * 4. Verify that the actor_type and event_type are persisted as requested,
 *    deleted_at is null (not soft-deleted), and optional diagnostic context
 *    (ip, user_agent, metadata) round-trips correctly.
 */
export async function test_api_actor_security_event_creation_for_customer_login_failure(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  // Type-level and runtime validation of the authorization payload.
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Sanity-check that the token has been issued and basic admin fields are present.
  typia.assert<IAuthorizationToken>(adminAuthorized.token);
  TestValidator.predicate(
    "admin email in authorization payload should match join request email",
    adminAuthorized.email === adminJoinBody.email,
  );
  TestValidator.predicate(
    "admin account should not be soft-deleted immediately after join",
    adminAuthorized.deleted_at === null,
  );

  // 2. Build a security event payload representing a failed customer login attempt.
  const metadataObject = {
    scenario: "CUSTOMER_LOGIN_FAILED",
    email: typia.random<string & tags.Format<"email">>(),
    reason: "INVALID_PASSWORD",
  } as const;
  const eventCreateBody = {
    actor_type: "customer",
    event_type: "LOGIN_FAILED",
    ip: "192.168.0.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
    metadata: JSON.stringify(metadataObject),
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  // 3. Create the security event as the authenticated admin.
  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: eventCreateBody,
      },
    );

  // 4. Validate the returned security event structure.
  typia.assert<IShoppingMallActorSecurityEvent>(createdEvent);

  // Core identity and lifecycle fields must be populated.
  TestValidator.predicate(
    "security event id must be present (non-empty string)",
    typeof createdEvent.id === "string" && createdEvent.id.length > 0,
  );
  TestValidator.predicate(
    "security event created_at must be an ISO date-time string",
    typeof createdEvent.created_at === "string" &&
      createdEvent.created_at.length > 0,
  );
  TestValidator.predicate(
    "security event updated_at must be an ISO date-time string",
    typeof createdEvent.updated_at === "string" &&
      createdEvent.updated_at.length > 0,
  );

  // The event should not be soft-deleted immediately after creation.
  TestValidator.equals(
    "security event deleted_at should be null right after creation",
    createdEvent.deleted_at ?? null,
    null,
  );

  // Ensure actor_type and event_type persist exactly as requested.
  TestValidator.equals(
    "actor_type should be persisted as provided in the create payload",
    createdEvent.actor_type,
    eventCreateBody.actor_type,
  );
  TestValidator.equals(
    "event_type should be persisted as provided in the create payload",
    createdEvent.event_type,
    eventCreateBody.event_type,
  );

  // Optional diagnostic fields should round-trip.
  TestValidator.equals(
    "ip should round-trip from creation payload to stored event",
    createdEvent.ip ?? null,
    eventCreateBody.ip,
  );
  TestValidator.equals(
    "user_agent should round-trip from creation payload to stored event",
    createdEvent.user_agent ?? null,
    eventCreateBody.user_agent,
  );
  TestValidator.equals(
    "metadata should round-trip from creation payload to stored event",
    createdEvent.metadata ?? null,
    eventCreateBody.metadata,
  );
}
