import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

export async function test_api_customer_security_events_filters_by_time_and_type(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer-join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  const customerId = authorized.customer.id;

  // baseline timestamp before generating explicit security events
  const testStart = new Date();
  const testStartIso = testStart.toISOString();

  // 2. Generate security-relevant actions to create events
  // 2-1) Two password reset requests (unauthenticated, by email)
  const resetReqBody1 = {
    email: joinBody.email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const beforeReq1 = new Date().toISOString();
  const resetResult1 =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetReqBody1,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetResult1,
  );
  const afterReq1 = new Date().toISOString();

  const resetReqBody2 = {
    email: joinBody.email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const beforeReq2 = new Date().toISOString();
  const resetResult2 =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetReqBody2,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetResult2,
  );
  const afterReq2 = new Date().toISOString();

  // 2-2) Authenticated password change to generate another kind of event
  // Use the connection that already has Authorization from join
  const changePasswordBody = {
    currentPassword: joinBody.password,
    newPassword: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerAuth.IChangePassword;

  const beforeChange = new Date().toISOString();
  const changedAuth =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      {
        body: changePasswordBody,
      },
    );
  typia.assert<IShoppingMallCustomer.IAuthorized>(changedAuth);
  const afterChange = new Date().toISOString();

  // 3. Fetch full security events for this customer over a wide window
  const fullFilter = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    created_from: testStartIso,
    created_to: new Date().toISOString(),
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const fullPage =
    await api.functional.shoppingMall.customer.customers.securityEvents.index(
      connection,
      {
        customerId,
        body: fullFilter,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(fullPage);

  const allEvents = fullPage.data;

  // Sanity: we expect at least one security event for this customer
  await TestValidator.predicate(
    "at least one security event exists for the test customer",
    async () => allEvents.length > 0,
  );

  // Gather distinct event_type values
  const distinctEventTypes = Array.from(
    new Set(allEvents.map((e) => e.event_type)),
  );

  await TestValidator.predicate(
    "at least one event_type is present in security events",
    async () => distinctEventTypes.length > 0,
  );

  // 4. Pick up to two distinct event_type values for filter validation
  const selectedTypes = distinctEventTypes.slice(0, 2);

  // Helper to compute min/max occurredAt for a given type
  const computeTimeBounds = (type: string) => {
    const eventsOfType = allEvents.filter((e) => e.event_type === type);
    if (eventsOfType.length === 0)
      return null as {
        min: string & tags.Format<"date-time">;
        max: string & tags.Format<"date-time">;
      } | null;

    const sorted = [...eventsOfType].sort((a, b) =>
      a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0,
    );
    const min = sorted[0]!.occurredAt;
    const max = sorted[sorted.length - 1]!.occurredAt;
    return { min, max } as {
      min: string & tags.Format<"date-time">;
      max: string & tags.Format<"date-time">;
    };
  };

  // 5. For each selected event_type, verify event_type and time-range filtering
  for (const eventType of selectedTypes) {
    const bounds = computeTimeBounds(eventType);
    if (bounds === null) continue;

    const filterByTypeAndTime = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
      event_type: eventType,
      created_from: bounds.min,
      created_to: bounds.max,
    } satisfies IShoppingMallSecurityEvent.IRequest;

    const pageByType =
      await api.functional.shoppingMall.customer.customers.securityEvents.index(
        connection,
        {
          customerId,
          body: filterByTypeAndTime,
        },
      );
    typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(pageByType);

    const events = pageByType.data;

    // All events must match the requested event_type
    for (const ev of events) {
      TestValidator.equals(
        `event_type filter returns only '${eventType}' events`,
        ev.event_type,
        eventType,
      );

      // All events must be within the requested time window
      TestValidator.predicate(
        "occurredAt is within the requested time window",
        ev.occurredAt >= bounds.min && ev.occurredAt <= bounds.max,
      );
    }
  }

  // 6. Pagination behavior: pick the first available event_type that has
  // at least two events.
  const typeWithMultiple = distinctEventTypes.find((t) => {
    const count = allEvents.filter((e) => e.event_type === t).length;
    return count >= 2;
  });

  if (typeWithMultiple !== undefined) {
    const eventsOfType = allEvents.filter(
      (e) => e.event_type === typeWithMultiple,
    );

    const paginationFilterPage1 = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      event_type: typeWithMultiple,
      created_from: testStartIso,
      created_to: new Date().toISOString(),
    } satisfies IShoppingMallSecurityEvent.IRequest;

    const page1 =
      await api.functional.shoppingMall.customer.customers.securityEvents.index(
        connection,
        {
          customerId,
          body: paginationFilterPage1,
        },
      );
    typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(page1);

    TestValidator.equals(
      "pagination.limit should reflect requested limit (1)",
      page1.pagination.limit,
      1,
    );

    TestValidator.predicate(
      "page1 should contain at most 1 event",
      page1.data.length <= 1,
    );

    if (eventsOfType.length > 1) {
      TestValidator.predicate(
        "when more than one event exists, records should be >= 2",
        page1.pagination.records >= 2,
      );

      const paginationFilterPage2 = {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        event_type: typeWithMultiple,
        created_from: testStartIso,
        created_to: new Date().toISOString(),
      } satisfies IShoppingMallSecurityEvent.IRequest;

      const page2 =
        await api.functional.shoppingMall.customer.customers.securityEvents.index(
          connection,
          {
            customerId,
            body: paginationFilterPage2,
          },
        );
      typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(page2);

      // When two pages exist, they should not have identical first items
      if (page1.data.length === 1 && page2.data.length === 1) {
        TestValidator.notEquals(
          "page1 and page2 should contain different event ids when multiple events exist",
          page1.data[0]!.id,
          page2.data[0]!.id,
        );
      }
    }
  }
}
