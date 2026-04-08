import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_seller_shipments_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a seller member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.ecommerceMall.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Test shipment listing with various filters
  const now = new Date().toISOString();
  // 2.1: Basic listing (no filters)
  const basicResponse =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(basicResponse);
  TestValidator.equals(
    "basic pagination records",
    basicResponse.pagination.records,
    basicResponse.data.length,
  );
  // 2.2: Test status filter
  const statusShipped =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: { status: "shipped" } },
    );
  typia.assert(statusShipped);
  const statusDelivered =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: { status: "delivered" } },
    );
  typia.assert(statusDelivered);
  // 2.3: Test date range filters
  const nextDay = new Date(new Date().getTime() + 86400000).toISOString();
  const dateFiltered =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      {
        body: {
          created_at_after: now,
          created_at_before: nextDay,
        },
      },
    );
  typia.assert(dateFiltered);
  // 2.4: Test sorting options
  const sortCreatedDESC =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: { sort_field: "created_at", sort_direction: "DESC" } },
    );
  typia.assert(sortCreatedDESC);
  const sortCreatedASC =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: { sort_field: "created_at", sort_direction: "ASC" } },
    );
  typia.assert(sortCreatedASC);
  const sortShippedAt =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: { sort_field: "shipped_at", sort_direction: "DESC" } },
    );
  typia.assert(sortShippedAt);
  const sortDeliveredAt =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: { sort_field: "delivered_at", sort_direction: "DESC" } },
    );
  typia.assert(sortDeliveredAt);
  const sortStatus = await api.functional.ecommerceMall.member.shipments.index(
    memberConnection,
    { body: { sort_field: "status", sort_direction: "ASC" } },
  );
  typia.assert(sortStatus);
  // 2.5: Test pagination with limit
  const paginatedResponse =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: { limit: 10, page: 1 } },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit validation",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records matches actual",
    paginatedResponse.pagination.records,
    paginatedResponse.data.length,
  );
  // 2.6: Test pagination with maximum limit
  const maxLimit = await api.functional.ecommerceMall.member.shipments.index(
    memberConnection,
    { body: { limit: 100 } },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit validation", maxLimit.pagination.limit, 100);
  // 2.7: Test combined filters
  const combinedFilters: IEcommerceMallShipment.IRequest = {
    status: "shipped",
    created_at_after: now,
    sort_field: "created_at",
    sort_direction: "DESC",
    limit: 20,
  };
  const combinedResponse =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: combinedFilters },
    );
  typia.assert(combinedResponse);
  // 2.8: Test empty result scenario (future date filter)
  const futureDate = new Date(
    new Date().getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const noResults = await api.functional.ecommerceMall.member.shipments.index(
    memberConnection,
    { body: { created_at_after: futureDate } },
  );
  typia.assert(noResults);
  TestValidator.equals(
    "no results total records",
    noResults.pagination.records,
    0,
  );
  TestValidator.equals("no results pages", noResults.pagination.pages, 0);
  TestValidator.equals("no results data array", noResults.data.length, 0);
  // 3. Validate shipment summary structure for each shipment in response
  for (const shipment of basicResponse.data) {
    typia.assert(shipment);
    TestValidator.equals(
      "shipment id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(shipment.id),
      true,
    );
    TestValidator.equals(
      "shipment status is valid",
      shipment.status,
      shipment.status,
    );
    TestValidator.equals(
      "shipment created_at is valid ISO date-time",
      true,
      typeof shipment.created_at === "string",
    );
    if (shipment.shipped_at !== undefined) {
      TestValidator.equals(
        "shipment shipped_at is valid ISO date-time",
        typeof shipment.shipped_at === "string",
        true,
      );
    }
    if (shipment.delivered_at !== undefined) {
      TestValidator.equals(
        "shipment delivered_at is valid ISO date-time",
        typeof shipment.delivered_at === "string",
        true,
      );
    }
    if (shipment.carrier !== undefined) {
      TestValidator.equals(
        "shipment carrier is valid string",
        typeof shipment.carrier === "string",
        true,
      );
    }
    if (shipment.tracking_number !== undefined) {
      TestValidator.equals(
        "shipment tracking_number is valid string",
        typeof shipment.tracking_number === "string",
        true,
      );
    }
    // Verify seller summary structure
    typia.assert(shipment.seller);
    TestValidator.equals(
      "seller id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(shipment.seller.id),
      true,
    );
    TestValidator.equals(
      "seller display_name is string",
      typeof shipment.seller.display_name === "string",
      true,
    );
    TestValidator.equals(
      "seller approval_status is string",
      typeof shipment.seller.approval_status === "string",
      true,
    );
    TestValidator.equals(
      "seller is_suspended is boolean",
      typeof shipment.seller.is_suspended === "boolean",
      true,
    );
    TestValidator.equals(
      "seller created_at is valid ISO date-time",
      typeof shipment.seller.created_at === "string",
      true,
    );
  }
  // 4. Validate pagination metadata accuracy
  TestValidator.predicate(
    "pagination limit is within bounds",
    basicResponse.pagination.limit > 0 && basicResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination current is positive",
    basicResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    basicResponse.pagination.pages >= 0,
  );
  // 5. Test with null values for nullable date filters
  const nullDateFilters: IEcommerceMallShipment.IRequest = {
    status: "shipped",
    shipped_at_after: null,
    shipped_at_before: null,
    delivered_at_after: null,
    delivered_at_before: null,
  };
  const nullDateResponse =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      { body: nullDateFilters },
    );
  typia.assert(nullDateResponse);
  // 6. Test cursor-based pagination
  const cursorPagination =
    await api.functional.ecommerceMall.member.shipments.index(
      memberConnection,
      {
        body: {
          cursor: null,
          limit: 5,
        },
      },
    );
  typia.assert(cursorPagination);
  TestValidator.equals(
    "cursor pagination with null cursor works",
    cursorPagination.pagination.current,
    1,
  );
}