import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate creation of actor security events with rich, investigation-grade
 * metadata.
 *
 * Business context:
 *
 * - Security monitoring and fraud investigation teams need to persist
 *   high-density contextual information (device fingerprints, correlation IDs,
 *   prior signals, automated risk engine notes) as a single metadata payload on
 *   each security event.
 * - The metadata field is modeled as a string but is expected to carry JSON
 *   content that can become quite large and structured.
 * - Admin-only API: only an authenticated administrator can create such events
 *   through POST /shoppingMall/admin/actorSecurityEvents.
 *
 * What this test verifies:
 *
 * 1. An admin can successfully join via POST /auth/admin/join and receive a valid
 *    IShoppingMallAdmin.IAuthorized payload (implicit token wiring is handled
 *    by the SDK).
 * 2. Using that authenticated context, the test calls POST
 *    /shoppingMall/admin/actorSecurityEvents with a payload that includes:
 *
 *    - Actor_type: a realistic actor segment such as "customer".
 *    - Event_type: an investigation-relevant code such as "ACCOUNT_LOCKED".
 *    - Metadata: a large JSON string containing multiple nested arrays and objects
 *         (previous event codes, device fingerprints, correlation IDs,
 *         automated risk engine notes, etc.).
 * 3. The API responds with an IShoppingMallActorSecurityEvent where:
 *
 *    - Basic fields (actor_type, event_type) match the request.
 *    - Metadata is not null/undefined and equals the original JSON string, proving
 *         that the server accepted and stored the full payload without
 *         truncation or normalization side effects.
 *
 * Limitations and scope:
 *
 * - No follow-up search/detail endpoint is available in the provided SDK, so the
 *   test validates round-trip integrity using only the create response.
 * - The test focuses on business-level behavior (capacity and integrity of the
 *   metadata field) rather than trying to provoke type or validation errors.
 */
export async function test_api_actor_security_event_creation_with_rich_metadata_for_investigation(
  connection: api.IConnection,
) {
  // 1. Arrange: register a new admin to obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // Intentionally omit ip so that backend can derive it; it's optional.
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Build rich metadata object that simulates an investigation payload.
  const metadataObject = {
    correlationId: RandomGenerator.alphaNumeric(16),
    actorContext: {
      actorType: "customer",
      riskTier: RandomGenerator.pick(["low", "medium", "high"] as const),
      lastKnownIp: "203.0.113.42",
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
    },
    timeline: ArrayUtil.repeat(10, (index) => ({
      index,
      code: RandomGenerator.pick([
        "LOGIN_FAILED",
        "MFA_CHALLENGE_SENT",
        "PASSWORD_RESET_REQUESTED",
        "ACCOUNT_LOCKED",
      ] as const),
      occurredAt: new Date(Date.now() - (10 - index) * 60 * 1000).toISOString(),
    })),
    signals: ArrayUtil.repeat(5, (index) => ({
      source: RandomGenerator.pick([
        "internal-engine",
        "siem",
        "fraud-partner",
      ] as const),
      weight: index + 1,
      label: RandomGenerator.paragraph({ sentences: 3 }),
    })),
    notes: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 8,
    }),
    previousEventIds: ArrayUtil.repeat(8, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  };

  const metadataJson = JSON.stringify(metadataObject);

  // 3. Act: create a new actor security event with rich metadata.
  const createBody = {
    actor_type: "customer",
    event_type: "ACCOUNT_LOCKED",
    ip: "203.0.113.42",
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    metadata: metadataJson,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdEvent);

  // 4. Assert: verify core fields and metadata round-trip integrity.
  TestValidator.equals(
    "actor_type should match request",
    createdEvent.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "event_type should match request",
    createdEvent.event_type,
    createBody.event_type,
  );

  // metadata is optional and may be null, but we expect it to be preserved
  // exactly as sent for this test case.
  TestValidator.predicate(
    "metadata should not be null or undefined",
    createdEvent.metadata !== null && createdEvent.metadata !== undefined,
  );

  TestValidator.equals(
    "metadata content should round-trip without truncation or modification",
    createdEvent.metadata,
    metadataJson,
  );
}
