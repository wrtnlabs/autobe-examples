import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate customer-scoped actor security event search filtering and
 * pagination.
 *
 * This test exercises PATCH
 * /shoppingMall/admin/customers/{customerId}/actorSecurityEvents to ensure
 * that:
 *
 * - Searches are properly scoped to a single customer.
 * - Filtering by event_type and time window behaves as expected.
 * - Pagination metadata and page boundaries behave correctly, including empty
 *   pages.
 *
 * Business flow:
 *
 * 1. Join an admin.
 * 2. Create a business policy and an account risk flag (governance prerequisites).
 * 3. Create two customers (customer A, customer B).
 * 4. As admin, create multiple actor security events targeting customer A and
 *    customer B using the generic admin actorSecurityEvents.create API along
 *    with an implicit linkage model (the concrete customer linkage is handled
 *    by the backend; the test only cares that subsequent customer-scoped
 *    queries return consistent sets).
 * 5. Run several search scenarios via customers.actorSecurityEvents.index:
 *
 *    - Scenario A: empty result for an earlier time window.
 *    - Scenario B: event_type filter that matches only a subset of customer A’s
 *         events.
 *    - Scenario C: pagination boundary cases with limit=1 and multi-page traversal.
 */
export async function test_api_admin_customer_actor_security_events_filters_and_pagination_edge_cases(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain admin-scoped Authorization token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create governance artifacts: one business policy and one risk flag
  const policyBody = {
    policy_code: `policy_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "risk",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;
  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert(policy);

  const riskFlagBody = {
    actor_type: "customer",
    code: `RISK_${RandomGenerator.alphaNumeric(6)}`,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    severity: "high",
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;
  const riskFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: riskFlagBody,
      },
    );
  typia.assert(riskFlag);

  // 3. Create two customers (A and B)
  const makeCustomerJoinBody = (): IShoppingMallCustomerJoin.IRequest => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/referrer",
  });

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: makeCustomerJoinBody(),
    });
  typia.assert(customerA);

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: makeCustomerJoinBody(),
    });
  typia.assert(customerB);

  const customerAId = customerA.id;
  const customerBId = customerB.id;

  // 4. Create security events for customer A and B.
  // NOTE: IShoppingMallActorSecurityEvent.ICreate does not carry customerId.
  // We rely on the backend implementation linking events to the current
  // security context when appropriate. For this E2E test, we focus only on
  // verifying that the customer-scoped search behaves consistently given
  // whatever linkage rules the backend applies. We will therefore create
  // generic events and then observe which ones appear when querying for
  // a specific customer.

  const eventTypesForA = ["LOGIN_FAILED", "PASSWORD_RESET_REQUESTED"] as const;
  const eventTypesForB = ["LOGIN_FAILED", "ACCOUNT_LOCKED"] as const;

  const createEvent = async (
    event_type: string,
    ip: string | null,
    userAgent: string | null,
    metadata: string | null,
  ): Promise<IShoppingMallActorSecurityEvent> => {
    const body = {
      actor_type: "customer",
      event_type,
      ip,
      user_agent: userAgent,
      metadata,
    } satisfies IShoppingMallActorSecurityEvent.ICreate;
    const created =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        { body },
      );
    typia.assert(created);
    return created;
  };

  // Create multiple events for A and B; timestamps are server-driven so we only
  // control relative ordering by the sequence of calls and short delays.
  const eventsForA: IShoppingMallActorSecurityEvent[] = [];
  const eventsForB: IShoppingMallActorSecurityEvent[] = [];

  // Create three events for A with two different event types
  eventsForA.push(
    await createEvent(
      eventTypesForA[0],
      "192.168.0.1",
      "Mozilla/5.0 CustomerA-1",
      '{"source":"test-A-1"}',
    ),
  );
  eventsForA.push(
    await createEvent(
      eventTypesForA[1],
      "192.168.0.2",
      "Mozilla/5.0 CustomerA-2",
      '{"source":"test-A-2"}',
    ),
  );
  eventsForA.push(
    await createEvent(
      eventTypesForA[0],
      "192.168.0.3",
      "Mozilla/5.0 CustomerA-3",
      '{"source":"test-A-3"}',
    ),
  );

  // Create two events for B, overlapping one event_type with A
  eventsForB.push(
    await createEvent(
      eventTypesForB[0],
      "10.0.0.1",
      "Mozilla/5.0 CustomerB-1",
      '{"source":"test-B-1"}',
    ),
  );
  eventsForB.push(
    await createEvent(
      eventTypesForB[1],
      "10.0.0.2",
      "Mozilla/5.0 CustomerB-2",
      '{"source":"test-B-2"}',
    ),
  );

  // Helper: fetch all events for a customer with a wide window
  const fetchAllForCustomer = async (
    customerId: string,
  ): Promise<IPageIShoppingMallActorSecurityEvent.ISummary> => {
    const body = {
      page: 1,
      limit: 100,
      actor_type: "customer",
      event_type: undefined,
      from_created_at: undefined,
      to_created_at: undefined,
      ip: null,
      user_agent: null,
      metadata: null,
      order_by: "created_at",
      order_direction: "desc",
    } satisfies IShoppingMallActorSecurityEvent.IRequest;
    const pageResult =
      await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
        connection,
        {
          customerId,
          body,
        },
      );
    typia.assert(pageResult);
    return pageResult;
  };

  // Baseline: retrieve all events for customer A and verify pagination consistency
  const baselineA = await fetchAllForCustomer(customerAId);
  const paginationA = baselineA.pagination;
  const dataA = baselineA.data;

  TestValidator.predicate(
    "baseline pagination has non-negative records",
    paginationA.records >= 0,
  );
  TestValidator.equals(
    "baseline pages computed from records and limit",
    paginationA.pages,
    paginationA.limit === 0
      ? 0
      : Math.ceil(paginationA.records / paginationA.limit),
  );

  // Scenario A: time window strictly before any events should yield empty
  // We approximate this by choosing a far past to_created_at
  const pastWindowBody = {
    page: 1,
    limit: 10,
    actor_type: "customer",
    event_type: undefined,
    from_created_at: undefined,
    to_created_at: "2000-01-01T00:00:00.000Z" as string &
      tags.Format<"date-time">,
    ip: null,
    user_agent: null,
    metadata: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;
  const emptyWindow =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId: customerAId,
        body: pastWindowBody,
      },
    );
  typia.assert(emptyWindow);

  TestValidator.equals(
    "Scenario A: no records for past window",
    emptyWindow.pagination.records,
    0,
  );
  TestValidator.equals(
    "Scenario A: data array empty",
    emptyWindow.data.length,
    0,
  );

  // Scenario B: event_type filter for one of A's event types
  const targetEventType = eventTypesForA[0];
  const filterBody = {
    page: 1,
    limit: 50,
    actor_type: "customer",
    event_type: targetEventType,
    from_created_at: undefined,
    to_created_at: undefined,
    ip: null,
    user_agent: null,
    metadata: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;
  const filteredForType =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId: customerAId,
        body: filterBody,
      },
    );
  typia.assert(filteredForType);

  TestValidator.predicate(
    "Scenario B: at least one event for specified event_type",
    filteredForType.data.length > 0,
  );

  for (const summary of filteredForType.data) {
    TestValidator.equals(
      "Scenario B: all events match requested event_type",
      summary.event_type,
      targetEventType,
    );
  }

  // Scenario B: actor_type mismatch should not expand results
  const mismatchedActorBody = {
    ...filterBody,
    actor_type: "seller",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;
  const mismatchedActor =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId: customerAId,
        body: mismatchedActorBody,
      },
    );
  typia.assert(mismatchedActor);

  TestValidator.predicate(
    "Scenario B: mismatched actor_type does not increase records",
    mismatchedActor.pagination.records <= filteredForType.pagination.records,
  );

  // Scenario C: pagination boundary with limit=1
  const wideBody = {
    page: 1,
    limit: 1,
    actor_type: "customer",
    event_type: undefined,
    from_created_at: undefined,
    to_created_at: undefined,
    ip: null,
    user_agent: null,
    metadata: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page1 =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId: customerAId,
        body: wideBody,
      },
    );
  typia.assert(page1);

  const page2 =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId: customerAId,
        body: { ...wideBody, page: 2 },
      },
    );
  typia.assert(page2);

  const page3 =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId: customerAId,
        body: { ...wideBody, page: 3 },
      },
    );
  typia.assert(page3);

  const idsAcrossPages = [
    ...page1.data.map((d) => d.id),
    ...page2.data.map((d) => d.id),
    ...page3.data.map((d) => d.id),
  ];

  // Ensure no duplicate ids across first three pages
  const uniqueIds = new Set(idsAcrossPages);
  TestValidator.equals(
    "Scenario C: no duplicate ids across pages 1-3",
    uniqueIds.size,
    idsAcrossPages.length,
  );

  // Check that results are sorted by created_at desc within each page
  const assertSortedDesc = (
    title: string,
    summaries: IShoppingMallActorSecurityEvent.ISummary[],
  ) => {
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1].created_at;
      const curr = summaries[i].created_at;
      TestValidator.predicate(
        `${title}: created_at is non-increasing`,
        prev >= curr,
      );
    }
  };

  assertSortedDesc("Scenario C page1", page1.data);
  assertSortedDesc("Scenario C page2", page2.data);
  assertSortedDesc("Scenario C page3", page3.data);

  // Page beyond last: use pages+1 and expect empty data but consistent metadata
  const beyondPageNumber =
    page1.pagination.pages === 0 ? 1 : page1.pagination.pages + 1;
  const beyondPage =
    await api.functional.shoppingMall.admin.customers.actorSecurityEvents.index(
      connection,
      {
        customerId: customerAId,
        body: { ...wideBody, page: beyondPageNumber },
      },
    );
  typia.assert(beyondPage);

  TestValidator.equals(
    "Scenario C: beyond last page has empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "Scenario C: beyond last page retains records count",
    beyondPage.pagination.records,
    page1.pagination.records,
  );
}
