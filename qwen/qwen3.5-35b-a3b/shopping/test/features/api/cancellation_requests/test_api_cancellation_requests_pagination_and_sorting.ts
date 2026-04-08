import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cancellation_requests_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member customer account
  const authConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create customer connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: authResult.token.access };
  // 3. Test default pagination (limit=20, cursor=null)
  const firstPage =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 20,
          sort: "created_at",
        },
      },
    );
  typia.assert(firstPage);
  // 4. Verify pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.equals(
    "first page records (total count)",
    firstPage.pagination.records,
    25,
  );
  TestValidator.equals("first page pages", firstPage.pagination.pages, 2);
  // 5. Verify first page has items returned
  TestValidator.predicate("first page returns data", firstPage.data.length > 0);
  // 6. Test second page with page parameter (offset-based pagination as alternative)
  const secondPage =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 20,
          sort: "created_at",
        },
      },
    );
  typia.assert(secondPage);
  // 7. Verify second page metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals("second page pages", secondPage.pagination.pages, 2);
  // 8. Test custom sorting by status
  const sortedByStatus =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          sort: "status",
        },
      },
    );
  typia.assert(sortedByStatus);
  // 9. Verify sorted data is present
  TestValidator.predicate(
    "sorted by status returns data",
    sortedByStatus.data.length > 0,
  );
  // 10. Test reverse sorting (-created_at)
  const reverseSorted =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          sort: "-created_at",
        },
      },
    );
  typia.assert(reverseSorted);
  // 11. Test sorting by reason
  const sortedByReason =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          sort: "reason",
        },
      },
    );
  typia.assert(sortedByReason);
  // 12. Test invalid limit (exceeds maximum)
  await TestValidator.httpError("limit > 100 returns 400", 400, async () => {
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 101,
        },
      },
    );
  });
  // 13. Test invalid limit (below minimum)
  await TestValidator.httpError("limit < 1 returns 400", 400, async () => {
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 0,
        },
      },
    );
  });
  // 14. Test invalid sort field
  await TestValidator.httpError(
    "invalid sort field returns 400",
    400,
    async () => {
      await api.functional.ecommerceMall.member.cancellation_requests.index(
        customerConnection,
        {
          body: {
            cursor: null,
            sort: "invalid_field",
          },
        },
      );
    },
  );
  // 15. Test status filter
  const filteredByStatus =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          status: "pending",
        },
      },
    );
  typia.assert(filteredByStatus);
  // 16. Verify filtered data structure
  if (filteredByStatus.data.length > 0) {
    const firstItem = filteredByStatus.data[0];
    typia.assert(firstItem);
    TestValidator.equals(
      "filtered item has reason",
      typeof firstItem.reason,
      "string",
    );
    TestValidator.equals(
      "filtered item has status",
      typeof firstItem.status,
      "string",
    );
    TestValidator.equals(
      "filtered item has created_at",
      typeof firstItem.created_at,
      "string",
    );
  }
  // 17. Test date range filtering (after_date)
  const filteredByDate =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          after_date: "2024-01-01T00:00:00Z",
        },
      },
    );
  typia.assert(filteredByDate);
  // 18. Test date range filtering (before_date)
  const filteredBefore =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          before_date: "2024-12-31T23:59:59Z",
        },
      },
    );
  typia.assert(filteredBefore);
  // 19. Test combined filters (status + date range)
  const combinedFilter =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          status: "approved",
          after_date: "2024-01-01T00:00:00Z",
          before_date: "2024-12-31T23:59:59Z",
        },
      },
    );
  typia.assert(combinedFilter);
  // 20. Test order_id filter
  const filteredByOrder =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerConnection,
      {
        body: {
          cursor: null,
          limit: 100,
          order_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(filteredByOrder);
}
