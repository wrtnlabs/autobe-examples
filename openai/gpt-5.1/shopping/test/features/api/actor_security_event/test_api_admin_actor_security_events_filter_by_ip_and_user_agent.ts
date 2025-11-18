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

/**
 * Validate filtering of admin actor security events by ip and user_agent.
 *
 * Business context:
 *
 * - Only admins can search actor security events via the PATCH
 *   /shoppingMall/admin/actorSecurityEvents endpoint.
 * - Security events contain optional ip and user_agent fields that are frequently
 *   used to investigate suspicious activity.
 * - The admin needs to reliably filter events by these fields without
 *   accidentally including events where the fields are null.
 *
 * Test steps:
 *
 * 1. Join an admin using POST /auth/admin/join to obtain an authorized admin
 *    context on the `connection`.
 * 2. Create three actor security events via POST
 *    /shoppingMall/admin/actorSecurityEvents with the following combinations:
 *
 *    - Event A: ip = "192.0.2.10", user_agent = "Mozilla/5.0 (Windows NT 10.0;
 *         Win64; x64)".
 *    - Event B: ip = "198.51.100.5", user_agent = "curl/8.0".
 *    - Event C: ip = null, user_agent = null.
 * 3. Call PATCH /shoppingMall/admin/actorSecurityEvents with a body of type
 *    IShoppingMallActorSecurityEvent.IRequest specifying only `ip` =
 *    "192.0.2.10" (no user_agent filter, other filters left undefined).
 * 4. Verify that:
 *
 *    - The response type matches IPageIShoppingMallActorSecurityEvent.ISummary.
 *    - All returned data items have ip exactly "192.0.2.10".
 *    - No item in the response has ip null.
 *    - Event B and Event C ids are not present in the result set, while Event A is
 *         present.
 *    - Pagination metadata is consistent: `current` equals the requested page,
 *         `limit` equals the requested limit, `records` equals data.length, and
 *         `pages` is 1 when all results fit into one page.
 * 5. Call PATCH /shoppingMall/admin/actorSecurityEvents again with a body
 *    specifying only `user_agent` = "curl/8.0".
 * 6. Verify that:
 *
 *    - All returned data items have user_agent exactly "curl/8.0".
 *    - No item in the response has user_agent null.
 *    - Event A and Event C ids are not present, while Event B is present.
 *    - Pagination metadata is again consistent with the records returned.
 * 7. Optionally, perform an unfiltered call (only pagination fields) to ensure
 *    that at least the three created events are present in the overall dataset,
 *    demonstrating that filtering is narrowing the results from a broader set
 *    rather than relying on global emptiness.
 */
export async function test_api_admin_actor_security_events_filter_by_ip_and_user_agent(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For join, ip/href/referrer must respect their formats, but
    // concrete values are not relevant to the filter scenario.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create three deterministic security events with specific ip/user_agent combinations
  const eventABase = {
    actor_type: "admin",
    event_type: "LOGIN_FAILED",
    metadata: null,
  } satisfies Pick<
    IShoppingMallActorSecurityEvent.ICreate,
    "actor_type" | "event_type" | "metadata"
  >;

  const eventABody = {
    ...eventABase,
    ip: "192.0.2.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const eventBBody = {
    ...eventABase,
    ip: "198.51.100.5",
    user_agent: "curl/8.0",
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const eventCBody = {
    ...eventABase,
    ip: null,
    user_agent: null,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const eventA: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      { body: eventABody },
    );
  typia.assert(eventA);

  const eventB: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      { body: eventBBody },
    );
  typia.assert(eventB);

  const eventC: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      { body: eventCBody },
    );
  typia.assert(eventC);

  // 3. Filter by ip = "192.0.2.10"
  const ipFilterRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    actor_type: undefined,
    event_type: undefined,
    from_created_at: undefined,
    to_created_at: undefined,
    ip: "192.0.2.10",
    user_agent: undefined,
    metadata: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const ipFilteredPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      { body: ipFilterRequest },
    );
  typia.assert(ipFilteredPage);

  const ipPagination: IPage.IPagination = ipFilteredPage.pagination;
  const ipData: IShoppingMallActorSecurityEvent.ISummary[] =
    ipFilteredPage.data;

  // Basic pagination expectations: single page when limit >= data length
  TestValidator.equals(
    "ip filter pagination current page is 1",
    ipPagination.current,
    1,
  );
  TestValidator.equals(
    "ip filter pagination limit is 10",
    ipPagination.limit,
    10,
  );
  TestValidator.equals(
    "ip filter pagination records equals data length",
    ipPagination.records,
    ipData.length,
  );
  TestValidator.equals(
    "ip filter pagination pages is 1 when data fits in one page",
    ipPagination.pages,
    1,
  );

  // All returned events must have ip === "192.0.2.10" and none null
  for (const summary of ipData) {
    TestValidator.equals(
      "every ip-filtered event has ip 192.0.2.10",
      summary.ip,
      "192.0.2.10",
    );
    TestValidator.predicate(
      "ip-filtered event ip is not null",
      summary.ip !== null,
    );
  }

  // Ensure Event A is present and B/C are absent
  const ipIds = ipData.map((s) => s.id);
  TestValidator.predicate(
    "ip-filtered result includes Event A",
    ipIds.includes(eventA.id),
  );
  TestValidator.predicate(
    "ip-filtered result excludes Event B",
    !ipIds.includes(eventB.id),
  );
  TestValidator.predicate(
    "ip-filtered result excludes Event C",
    !ipIds.includes(eventC.id),
  );

  // 5. Filter by user_agent = "curl/8.0"
  const uaFilterRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    actor_type: undefined,
    event_type: undefined,
    from_created_at: undefined,
    to_created_at: undefined,
    ip: undefined,
    user_agent: "curl/8.0",
    metadata: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const uaFilteredPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      { body: uaFilterRequest },
    );
  typia.assert(uaFilteredPage);

  const uaPagination: IPage.IPagination = uaFilteredPage.pagination;
  const uaData: IShoppingMallActorSecurityEvent.ISummary[] =
    uaFilteredPage.data;

  TestValidator.equals(
    "user-agent filter pagination current page is 1",
    uaPagination.current,
    1,
  );
  TestValidator.equals(
    "user-agent filter pagination limit is 10",
    uaPagination.limit,
    10,
  );
  TestValidator.equals(
    "user-agent filter pagination records equals data length",
    uaPagination.records,
    uaData.length,
  );
  TestValidator.equals(
    "user-agent filter pagination pages is 1 when data fits in one page",
    uaPagination.pages,
    1,
  );

  for (const summary of uaData) {
    TestValidator.equals(
      "every ua-filtered event has user_agent curl/8.0",
      summary.user_agent,
      "curl/8.0",
    );
    TestValidator.predicate(
      "ua-filtered event user_agent is not null",
      summary.user_agent !== null,
    );
  }

  const uaIds = uaData.map((s) => s.id);
  TestValidator.predicate(
    "ua-filtered result includes Event B",
    uaIds.includes(eventB.id),
  );
  TestValidator.predicate(
    "ua-filtered result excludes Event A",
    !uaIds.includes(eventA.id),
  );
  TestValidator.predicate(
    "ua-filtered result excludes Event C",
    !uaIds.includes(eventC.id),
  );

  // 7. Optional sanity check: unfiltered query containing at least our 3 events
  const unfilteredRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const unfilteredPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      { body: unfilteredRequest },
    );
  typia.assert(unfilteredPage);

  const unfilteredIds = unfilteredPage.data.map((s) => s.id);
  TestValidator.predicate(
    "unfiltered results include Event A",
    unfilteredIds.includes(eventA.id),
  );
  TestValidator.predicate(
    "unfiltered results include Event B",
    unfilteredIds.includes(eventB.id),
  );
  TestValidator.predicate(
    "unfiltered results include Event C",
    unfilteredIds.includes(eventC.id),
  );
}
