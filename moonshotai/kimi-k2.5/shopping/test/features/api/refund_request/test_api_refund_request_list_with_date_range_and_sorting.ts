import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test refund request list filtering with date range and sorting.
 *
 * @param connection - Base connection
 */
export async function test_api_refund_request_list_with_date_range_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Test with submittedAfter and submittedBefore date range filters
  const submittedAfter = "2026-01-01T00:00:00.000Z";
  const submittedBefore = "2026-12-31T23:59:59.000Z";
  const responseBySubmittedDate =
    await api.functional.ecommerceMall.customer.refundRequests.index(
      customerConnection,
      {
        body: {
          submittedAfter,
          submittedBefore,
          sortField: "submittedAt",
          sortOrder: "asc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(responseBySubmittedDate);
  // 3. Validate all results are within the submitted date range
  for (const item of responseBySubmittedDate.data) {
    TestValidator.predicate(
      "submittedAt within date range",
      item.submittedAt >= submittedAfter && item.submittedAt <= submittedBefore,
    );
  }
  // 4. Validate sorting (ascending - oldest first)
  if (responseBySubmittedDate.data.length > 1) {
    for (let i = 1; i < responseBySubmittedDate.data.length; i++) {
      const prev = responseBySubmittedDate.data[i - 1];
      const curr = responseBySubmittedDate.data[i];
      TestValidator.predicate(
        "sorted by submittedAt ascending",
        prev.submittedAt <= curr.submittedAt,
      );
    }
  }
  // 5. Test with respondedAfter and respondedBefore filters
  const respondedAfter = "2026-01-01T00:00:00.000Z";
  const respondedBefore = "2026-12-31T23:59:59.000Z";
  const responseByRespondedDate =
    await api.functional.ecommerceMall.customer.refundRequests.index(
      customerConnection,
      {
        body: {
          respondedAfter,
          respondedBefore,
          sortField: "respondedAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(responseByRespondedDate);
  // 6. Validate hasResponse flag and respondedAt for responded requests
  for (const item of responseByRespondedDate.data) {
    TestValidator.predicate(
      "hasResponse matches respondedAt presence",
      item.hasResponse === (item.respondedAt !== null),
    );
    if (item.hasResponse && item.respondedAt) {
      TestValidator.predicate(
        "respondedAt within date range",
        item.respondedAt >= respondedAfter &&
          item.respondedAt <= respondedBefore,
      );
    }
  }
  // 7. Validate sorting (descending - newest first)
  if (responseByRespondedDate.data.length > 1) {
    const respondedItems = responseByRespondedDate.data.filter(
      (item) => item.respondedAt !== null,
    );
    for (let i = 1; i < respondedItems.length; i++) {
      const prev = respondedItems[i - 1];
      const curr = respondedItems[i];
      if (prev.respondedAt && curr.respondedAt) {
        TestValidator.predicate(
          "sorted by respondedAt descending",
          prev.respondedAt >= curr.respondedAt,
        );
      }
    }
  }
  // 8. Test with status filter combined with date range
  const responseWithStatusFilter =
    await api.functional.ecommerceMall.customer.refundRequests.index(
      customerConnection,
      {
        body: {
          submittedAfter,
          submittedBefore,
          status: "pending",
          sortField: "submittedAt",
          sortOrder: "asc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(responseWithStatusFilter);
  // Validate all results have pending status
  for (const item of responseWithStatusFilter.data) {
    TestValidator.equals("status is pending", item.status, "pending");
    // Pending requests should not have a response
    TestValidator.predicate(
      "pending requests have no response",
      item.hasResponse === false && item.respondedAt === null,
    );
  }
  // 9. Test pagination with limit
  const responseWithLimit =
    await api.functional.ecommerceMall.customer.refundRequests.index(
      customerConnection,
      {
        body: {
          submittedAfter,
          submittedBefore,
          sortField: "submittedAt",
          sortOrder: "asc",
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(responseWithLimit);
  TestValidator.equals(
    "respects limit",
    responseWithLimit.data.length <= 10,
    true,
  );
}
