import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

/**
 * Validate that actor security events protected by a legal hold cannot be
 * deleted.
 *
 * Business context:
 *
 * - Security events represent sensitive governance records in
 *   `shopping_mall_actor_security_events`.
 * - Legal holds in `shopping_mall_legal_holds` are used to freeze specific
 *   entities (via legal hold targets) so they cannot be deleted or altered
 *   while an investigation or litigation is active.
 * - Administrative users must not be able to erase security events that are under
 *   an active legal hold.
 *
 * Scenario steps implemented using only available APIs:
 *
 * 1. Admin onboarding & authentication via POST /auth/admin/join.
 *
 *    - Use realistic join payload following IShoppingMallAdminJoin.ICreate.
 *    - After join, the SDK automatically stores the admin access token in
 *         connection.headers.Authorization.
 * 2. Create an actor security event via POST
 *    /shoppingMall/admin/actorSecurityEvents.
 *
 *    - Use IShoppingMallActorSecurityEvent.ICreate as body.
 *    - Use an `actor_type` corresponding to an admin-related event and a synthetic
 *         `event_type` string, with optional metadata like IP, user agent, and
 *         JSON metadata text.
 *    - Capture the returned event, particularly its `id`, which is the
 *         securityEventId path parameter for erase.
 * 3. Create a legal hold via POST /shoppingMall/admin/legalHolds.
 *
 *    - Build IShoppingMallLegalHold.ICreate with a unique `code`, `title`, `status`
 *         (e.g. "active"), and optional
 *         description/scope/external_reference/effective_from.
 *    - The response includes the authoritative legal hold structure including its
 *         code and status.
 * 4. Attach the actor security event as a target of the legal hold via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets.
 *
 *    - Use the `code` from the created legal hold as `legalHoldCode` path parameter.
 *    - Body is IShoppingMallLegalHoldTarget.ICreate, with `target_type` (e.g.
 *         "actor_security_event"), `target_id` equal to the security event id,
 *         and optional display/note.
 *    - This models that the security event is under the scope of the legal hold.
 * 5. Attempt to delete the actor security event via DELETE
 *    /shoppingMall/admin/actorSecurityEvents/{securityEventId} using the same
 *    authenticated admin.
 *
 *    - Call api.functional.shoppingMall.admin.actorSecurityEvents.erase with the
 *         `id` from step 2.
 *    - Because the SDK does not expose HTTP status or response body directly and the
 *         test framework forbids status-code-sensitive assertions, validate
 *         failure using TestValidator.error by asserting that the erase call
 *         throws (e.g. HttpError) instead of succeeding.
 *    - This ensures that governance logic is consulted and a protected event cannot
 *         be removed.
 * 6. Indirect persistence validation.
 *
 *    - We cannot call a GET endpoint for actor security events because none is
 *         provided.
 *    - Instead, we rely on:
 *
 *         - The successful creation response from step 2 being well-formed (typia.assert
 *                   on the event object), and
 *         - The fact that the attempted erase failed (the error assertion in step 5),
 *                   meaning the backend refused to delete a record known to
 *                   exist.
 *    - Together these validate that legal hold associations take precedence over
 *         admin deletion attempts and that security events under legal hold
 *         cannot be erased.
 */
export async function test_api_actor_security_event_deletion_respects_legal_hold_constraints(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an actor security event that we will later protect via legal hold
  const createEventBody = {
    actor_type: "admin",
    event_type: "LOGIN_FAILED_UNDER_TEST",
    ip: "127.0.0.1",
    user_agent: RandomGenerator.name(2),
    metadata: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const securityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      { body: createEventBody },
    );
  typia.assert<IShoppingMallActorSecurityEvent>(securityEvent);

  // 3. Create a legal hold configuration
  const legalHoldCode = `lh-${RandomGenerator.alphaNumeric(12)}`;
  const legalHoldCreateBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 5 }),
    external_reference: RandomGenerator.alphaNumeric(10),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold = await api.functional.shoppingMall.admin.legalHolds.create(
    connection,
    { body: legalHoldCreateBody },
  );
  typia.assert<IShoppingMallLegalHold>(legalHold);

  TestValidator.equals(
    "legal hold code should match requested code",
    legalHold.code,
    legalHoldCode,
  );

  // 4. Attach the security event as a legal hold target
  const targetCreateBody = {
    target_type: "actor_security_event",
    target_id: securityEvent.id,
    target_display: `SecurityEvent:${securityEvent.id}`,
    note: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const legalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: targetCreateBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(legalHoldTarget);

  TestValidator.equals(
    "legal hold target id must match security event id",
    legalHoldTarget.target_id,
    securityEvent.id,
  );

  // 5. Attempt to delete the protected security event and expect failure
  await TestValidator.error(
    "deleting a security event under legal hold must fail",
    async () => {
      await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
        connection,
        { securityEventId: securityEvent.id },
      );
    },
  );

  // 6. Indirect persistence validation via the fact that creation succeeded and deletion failed
  //    We cannot re-fetch the event (no GET endpoint), but we can still assert that the
  //    created event we hold in memory is structurally valid and that the legal hold linkage
  //    is bound to the same id, establishing correct governance relationship.
  TestValidator.equals(
    "security event id should remain consistent through the workflow",
    securityEvent.id,
    legalHoldTarget.target_id,
  );
}
