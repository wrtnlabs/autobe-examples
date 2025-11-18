import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Basic guest-user-scoped actor security events search flow.
 *
 * Business purpose:
 *
 * - Ensure an administrator can search actor security events linked (internally)
 *   to a specific guest user id using the guest-user-scoped search endpoint.
 * - Validate that pagination metadata and summary fields are structurally correct
 *   and that filtering by actor_type works at least at the response level.
 *
 * Test steps:
 *
 * 1. Register admin A via POST /auth/admin/join. The SDK updates
 *    connection.headers.Authorization to admin access token.
 * 2. Register guest user G via POST /auth/guestUser/join. This temporarily
 *    switches Authorization to a guest token, but we only need G.id.
 * 3. Re-register admin A (second /auth/admin/join) to ensure the connection is
 *    authenticated as admin for subsequent admin-only endpoints.
 * 4. As admin A, create several actor security events via POST
 *    /shoppingMall/admin/actorSecurityEvents with actor_type = "guestuser" and
 *    varying event_type values, plus optional IP and user_agent fields.
 * 5. Call PATCH /shoppingMall/admin/guestUsers/{guestUserId}/actorSecurityEvents
 *    with guestUserId = G.id and a IShoppingMallActorSecurityEvent.IRequest
 *    body specifying: page = 1, limit large enough, actor_type = "guestuser",
 *    and a simple ordering on created_at descending (order_by,
 *    order_direction).
 * 6. Validate that:
 *
 *    - The response conforms to IPageIShoppingMallActorSecurityEvent.ISummary via
 *         typia.assert.
 *    - Pagination.current === 1 and pagination.limit >= returned data length.
 *    - Pagination.records >= data.length and pagination.pages >= 1.
 *    - Every summary row has actor_type === "guestuser" and non-empty event_type,
 *         and created_at is a valid date-time string.
 *
 * Notes:
 *
 * - The concrete linkage between security events and guest users is managed by
 *   internal linkage tables not visible in the DTOs, so this test does not
 *   assert that the created events are _specifically_ associated with G. It
 *   instead focuses on type correctness, pagination behavior, and basic
 *   actor_type-level filtering around a realistic guest user id.
 */
export async function test_api_guestuser_actor_security_events_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join as admin A (initial admin registration and token issuance)
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Join a guest user G and capture its id
  const guestJoinBody = {
    external_reference: undefined,
  } satisfies IShoppingMallGuestUser.IJoin;

  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(guestAuthorized);

  const guestUserId: string & tags.Format<"uuid"> = guestAuthorized.id;

  // 3. Re-join as admin to ensure admin authorization on the connection
  const adminRejoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminReauthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminReauthorized);

  // 4. As admin, create multiple actor security events with actor_type = "guestuser"
  const eventTypes = [
    "LOGIN_FAILED",
    "ACCOUNT_LOCKED",
    "PASSWORD_RESET_REQUESTED",
  ] as const;

  const createdEvents: IShoppingMallActorSecurityEvent[] = [];

  for (let i = 0; i < eventTypes.length; i++) {
    const createBody = {
      actor_type: "guestuser",
      event_type: eventTypes[i],
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string,
      user_agent: RandomGenerator.paragraph({ sentences: 2 }),
      metadata: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    createdEvents.push(created);
  }

  // 5. Search actor security events for the specific guest user
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    actor_type: "guestuser",
    event_type: undefined,
    from_created_at: undefined,
    to_created_at: undefined,
    ip: null,
    user_agent: null,
    metadata: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.actorSecurityEvents.index(
      connection,
      {
        guestUserId,
        body: requestBody,
      },
    );

  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(page);

  const pagination = page.pagination;
  const data = page.data;

  // 6. Pagination assertions
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination limit should be at least returned data length",
    pagination.limit >= data.length,
  );

  TestValidator.predicate(
    "pagination records should be >= data length",
    pagination.records >= data.length,
  );

  TestValidator.predicate(
    "pagination pages should be >= 1",
    pagination.pages >= 1,
  );

  // 7. Summary row-level assertions
  for (const summary of data) {
    // actor_type must be "guestuser" per filter
    TestValidator.equals(
      "actor_type of each summary should be 'guestuser'",
      summary.actor_type,
      "guestuser",
    );

    // event_type should be a non-empty string
    TestValidator.predicate(
      "event_type should be non-empty",
      summary.event_type.length > 0,
    );

    // created_at is already type-checked by typia.assert as date-time format,
    // but we can still assert it is a non-empty string for business sanity.
    TestValidator.predicate(
      "created_at should be a non-empty string",
      summary.created_at.length > 0,
    );
  }
}
