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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_seller_actor_security_events_filters_and_empty_results(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create two sellers (A and B)
  const sellerJoinCommon = {
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies Pick<
    IShoppingMallSellerAuthJoin.IRequest,
    "ip" | "href" | "referrer"
  >;

  const sellerABody = {
    email: `${RandomGenerator.alphabets(8)}@seller-a.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: sellerJoinCommon.ip,
    href: sellerJoinCommon.href,
    referrer: sellerJoinCommon.referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerABody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  const sellerBBody = {
    email: `${RandomGenerator.alphabets(8)}@seller-b.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: sellerJoinCommon.ip,
    href: sellerJoinCommon.href,
    referrer: sellerJoinCommon.referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // 3. As admin, create actor security events
  const eventTypes = [
    "LOGIN_FAILED",
    "ACCOUNT_LOCKED",
    "PASSWORD_RESET_REQUESTED",
  ] as const;

  const createEventForSeller = async (
    eventType: string,
  ): Promise<IShoppingMallActorSecurityEvent> => {
    const body = {
      actor_type: "seller",
      event_type: eventType,
      ip: "192.168.0.1",
      user_agent: "Mozilla/5.0 (E2E Test)",
      metadata: JSON.stringify({ scenario: "filters_and_empty_results" }),
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    return created;
  };

  // Create multiple events for seller A (conceptually)
  const sellerAEvents: IShoppingMallActorSecurityEvent[] = [];
  for (const eventType of eventTypes) {
    const created = await createEventForSeller(eventType);
    sellerAEvents.push(created);
  }
  const extraEventA = await createEventForSeller(
    RandomGenerator.pick(eventTypes),
  );
  sellerAEvents.push(extraEventA);

  // Create events for seller B (control group)
  const sellerBEvents: IShoppingMallActorSecurityEvent[] = [];
  const bEvent = await createEventForSeller(RandomGenerator.pick(eventTypes));
  sellerBEvents.push(bEvent);

  // Helper to fetch seller-scoped events with arbitrary request body
  const fetchSellerEvents = async (
    sellerId: string,
    request: IShoppingMallActorSecurityEvent.IRequest,
  ): Promise<IPageIShoppingMallActorSecurityEvent.ISummary> => {
    const output =
      await api.functional.shoppingMall.admin.sellers.actorSecurityEvents.index(
        connection,
        {
          sellerId,
          body: request,
        },
      );
    typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(output);
    return output;
  };

  // First, load all events for seller A without filters to learn actual created_at
  const allForSellerARequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 100 as number & tags.Type<"int32">,
    actor_type: "seller",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const allForSellerA = await fetchSellerEvents(
    sellerA.id,
    allForSellerARequest,
  );

  TestValidator.predicate(
    "seller A should have at least as many records as events created conceptually",
    allForSellerA.pagination.records >= sellerAEvents.length,
  );

  TestValidator.predicate(
    "allForSellerA data should not be empty",
    allForSellerA.data.length > 0,
  );

  const createdAtValues = allForSellerA.data.map((e) => e.created_at);
  createdAtValues.sort();

  const earliestCreatedAt = createdAtValues[0];
  const latestCreatedAt = createdAtValues[createdAtValues.length - 1];

  // 4. Case 1 – Empty results: time range strictly before earliestCreatedAt
  const beforeEarliestDate = new Date(earliestCreatedAt);
  const beforeWindowEnd = new Date(beforeEarliestDate.getTime() - 60 * 1000);
  const beforeWindowEndIso = beforeWindowEnd.toISOString();

  const emptyCaseRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    actor_type: "seller",
    to_created_at: beforeWindowEndIso as string & tags.Format<"date-time">,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const emptyCaseResult = await fetchSellerEvents(sellerA.id, emptyCaseRequest);

  TestValidator.equals(
    "empty case should have zero records",
    emptyCaseResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty case should have zero pages",
    emptyCaseResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty case data length should be zero",
    emptyCaseResult.data.length,
    0,
  );

  // 5. Case 2 – Time range filter returning subset of events
  const middleIndex = Math.floor(createdAtValues.length / 2);
  const subsetFrom = createdAtValues[middleIndex];
  const subsetTo = latestCreatedAt;

  const timeRangeRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 100 as number & tags.Type<"int32">,
    actor_type: "seller",
    from_created_at: subsetFrom as string & tags.Format<"date-time">,
    to_created_at: subsetTo as string & tags.Format<"date-time">,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const timeRangeResult = await fetchSellerEvents(sellerA.id, timeRangeRequest);

  TestValidator.predicate(
    "time range result should not be empty",
    timeRangeResult.data.length > 0,
  );

  for (const event of timeRangeResult.data) {
    TestValidator.predicate(
      "event.created_at should be within the requested time window",
      event.created_at >= subsetFrom && event.created_at <= subsetTo,
    );
  }

  TestValidator.predicate(
    "time range records should be >= data length",
    timeRangeResult.pagination.records >= timeRangeResult.data.length,
  );

  // 6. Case 3 – event_type filter
  const targetEventType = RandomGenerator.pick(eventTypes);

  const eventTypeRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 100 as number & tags.Type<"int32">,
    actor_type: "seller",
    event_type: targetEventType,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const eventTypeResult = await fetchSellerEvents(sellerA.id, eventTypeRequest);

  TestValidator.predicate(
    "event_type-filtered result should have at least one record when records > 0",
    eventTypeResult.pagination.records === 0 || eventTypeResult.data.length > 0,
  );

  for (const event of eventTypeResult.data) {
    TestValidator.equals(
      "all returned events must match requested event_type",
      event.event_type,
      targetEventType,
    );
    TestValidator.equals(
      "all returned events must be for actor_type 'seller'",
      event.actor_type,
      "seller",
    );
  }

  // 7. Ensure pagination consistency in all responses
  const pagesToCheck: IPageIShoppingMallActorSecurityEvent.ISummary[] = [
    allForSellerA,
    emptyCaseResult,
    timeRangeResult,
    eventTypeResult,
  ];

  for (const page of pagesToCheck) {
    const p = page.pagination;
    TestValidator.predicate(
      "records count must be >= current page data length",
      p.records >= page.data.length,
    );
    TestValidator.predicate(
      "limit must be >= data length",
      p.limit >= page.data.length,
    );
    TestValidator.predicate(
      "pages should be zero when records is zero, otherwise at least 1",
      (p.records === 0 && p.pages === 0) || (p.records > 0 && p.pages >= 1),
    );
  }
}
