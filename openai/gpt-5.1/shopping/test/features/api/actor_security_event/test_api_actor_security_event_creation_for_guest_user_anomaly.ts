import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an authenticated admin can create a security event for a guest
 * user anomaly.
 *
 * Business context:
 *
 * - Platform administrators must be able to register security events that concern
 *   non-registered actors, such as guest users who browse, fill carts, or build
 *   wishlists without logging in.
 * - Such events must clearly encode the actor_type as "guestuser" and preserve
 *   technical context such as IP address, user agent, and correlation metadata
 *   so that later investigations or search flows can reconstruct what
 *   happened.
 *
 * End-to-end steps:
 *
 * 1. Join as an admin using POST /auth/admin/join, which also authenticates the
 *    connection by installing the access token into the Authorization header.
 * 2. As the authenticated admin, call POST /shoppingMall/admin/actorSecurityEvents
 *    with actor_type="guestuser" and an anomaly-like event_type string, along
 *    with ip, user_agent, and a JSON string metadata including guest
 *    cart/wishlist IDs.
 * 3. Validate that the created IShoppingMallActorSecurityEvent echoes back these
 *    values and that typia.assert confirms the structural correctness including
 *    timestamps.
 */
export async function test_api_actor_security_event_creation_for_guest_user_anomaly(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin using POST /auth/admin/join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip can be omitted or provided; use ipv4 here for realism.
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an actor security event for a guest user anomaly.
  const anomalyEventType = "GUEST_CART_FRAUD_SUSPECTED";
  const guestIp = typia.random<string & tags.Format<"ipv4">>();
  const guestUserAgent = `Mozilla/5.0 (${RandomGenerator.name(1)}; TestBrowser)`;

  const metadataObject = {
    guest_cart_id: RandomGenerator.alphaNumeric(16),
    guest_wishlist_id: RandomGenerator.alphaNumeric(16),
    correlation_id: RandomGenerator.alphaNumeric(24),
    note: "Anomaly detected for guest cart behavior",
  };
  const metadataString = JSON.stringify(metadataObject);

  const createBody = {
    actor_type: "guestuser",
    event_type: anomalyEventType,
    ip: guestIp,
    user_agent: guestUserAgent,
    metadata: metadataString,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdEvent);

  // 3. Validate important field semantics.
  TestValidator.equals(
    "actor_type must be preserved as guestuser",
    createdEvent.actor_type,
    createBody.actor_type,
  );

  TestValidator.equals(
    "event_type must match the anomaly code provided",
    createdEvent.event_type,
    anomalyEventType,
  );

  TestValidator.equals(
    "ip must echo the guest session IP provided in the request",
    createdEvent.ip,
    createBody.ip,
  );

  TestValidator.equals(
    "user_agent must echo the guest session user agent",
    createdEvent.user_agent,
    createBody.user_agent,
  );

  TestValidator.equals(
    "metadata must preserve serialized guest correlation context",
    createdEvent.metadata,
    metadataString,
  );

  // Sanity check that created_at and updated_at are non-empty ISO date-time strings.
  TestValidator.predicate(
    "created_at must be a non-empty ISO date-time string",
    createdEvent.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty ISO date-time string",
    createdEvent.updated_at.length > 0,
  );
}
