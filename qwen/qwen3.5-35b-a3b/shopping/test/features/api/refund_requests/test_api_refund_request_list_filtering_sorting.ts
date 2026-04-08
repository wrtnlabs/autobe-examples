import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refund_request_list_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for testing
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // Note: Test data setup - Since there is no refund request creation endpoint
  // available in the API, we test filtering and sorting with existing data
  // in the test database. The customer may have pre-existing refund requests.
  // 2. Test unfiltered list - should return all refund requests sorted by created_at desc
  const unfilteredResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(unfilteredResult);
  TestValidator.predicate(
    "unfiltered list has valid pagination",
    unfilteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "unfiltered list respects default sort (desc)",
    () => {
      if (unfilteredResult.data.length <= 1) return true;
      for (let i = 1; i < unfilteredResult.data.length; i++) {
        if (
          new Date(unfilteredResult.data[i].created_at) >
          new Date(unfilteredResult.data[i - 1].created_at)
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 3. Test status filter - request only pending requests
  const pendingResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingResult.data.every((item) => item.status === "pending"),
  );
  TestValidator.equals(
    "pending filter pagination valid",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  // 4. Test status filter - request only approved requests
  const approvedResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: { status: "approved" },
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approvedResult.data.every((item) => item.status === "approved"),
  );
  // 5. Test status filter - request only rejected requests
  const rejectedResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: { status: "rejected" },
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejectedResult.data.every((item) => item.status === "rejected"),
  );
  // 6. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dateFilteredResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: now.toISOString(),
        },
      },
    );
  typia.assert(dateFilteredResult);
  TestValidator.predicate(
    "date filter returns requests within range",
    dateFilteredResult.data.every((item) => {
      const itemDate = new Date(item.created_at);
      return itemDate >= oneWeekAgo && itemDate <= now;
    }),
  );
  TestValidator.equals(
    "date filter pagination valid",
    dateFilteredResult.pagination.records,
    dateFilteredResult.data.length,
  );
  // 7. Test reason text search
  const searchReason = RandomGenerator.paragraph({ sentences: 2 });
  const searchResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: { reason_search: searchReason },
      },
    );
  typia.assert(searchResult);
  // Validate all returned items match search term (case-insensitive)
  if (searchResult.data.length > 0) {
    TestValidator.predicate(
      "reason search returns matching requests",
      searchResult.data.every((item) =>
        item.reason.toLowerCase().includes(searchReason.toLowerCase()),
      ),
    );
  }
  // 8. Test sorting by created_at ascending
  const sortedAscendingResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: { sort_field: "created_at", sort_order: "asc" },
      },
    );
  typia.assert(sortedAscendingResult);
  TestValidator.predicate(
    "ascending sort orders by created_at correctly",
    sortedAscendingResult.data.every((item, index, array) => {
      if (index === 0) return true;
      return new Date(item.created_at) >= new Date(array[index - 1].created_at);
    }),
  );
  // 9. Test sorting by updated_at descending
  const updatedSortResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: { sort_field: "updated_at", sort_order: "desc" },
      },
    );
  typia.assert(updatedSortResult);
  TestValidator.predicate(
    "updated_at descending sort works correctly",
    updatedSortResult.data.every((item, index, array) => {
      if (index === 0) return true;
      return new Date(item.updated_at) <= new Date(array[index - 1].updated_at);
    }),
  );
  // 10. Test pagination limit parameter
  const limitedResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: { limit: 5 },
      },
    );
  typia.assert(limitedResult);
  TestValidator.predicate(
    "limit parameter caps result count",
    limitedResult.pagination.records === 0 || limitedResult.data.length <= 5,
  );
  // 11. Test combined filters: status + date + sort
  const combinedResult =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          created_at_from: twoWeeksAgo.toISOString(),
          sort_field: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedResult.data.every((item) => {
      const dateCheck = new Date(item.created_at) >= twoWeeksAgo;
      return item.status === "pending" && dateCheck;
    }),
  );
  TestValidator.predicate(
    "combined filters respect sort order",
    combinedResult.data.every((item, index, array) => {
      if (index === 0) return true;
      return new Date(item.created_at) <= new Date(array[index - 1].created_at);
    }),
  );
  // 12. Test cursor-based pagination
  if (unfilteredResult.data.length > 0) {
    const cursor = unfilteredResult.data[unfilteredResult.data.length - 1].id;
    const cursorResult =
      await api.functional.ecommerceMall.member.customer.refund_requests.index(
        customerConnection,
        {
          body: { cursor },
        },
      );
    typia.assert(cursorResult);
    TestValidator.predicate(
      "cursor pagination returns next page",
      cursorResult.pagination.current >= 2,
    );
  }
}
