import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_requests_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, { body: undefined });
  typia.assert(customer);
  // 2. Call cancellation requests index endpoint
  const response: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: { pageSize: 10 } },
    );
  typia.assert(response);
  // 3. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    response.pagination.pages >= 0,
  );
  // 4. Verify data array structure and business rules
  if (response.data.length > 0) {
    const sampleItem: IEcommerceMallCancellationRequest.ISummary =
      response.data[0];
    // 5. Verify cancellation request summary fields exist
    TestValidator.predicate(
      "cancellation request has id",
      sampleItem.id.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has customer_id",
      sampleItem.customer_id.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has order_item_id",
      sampleItem.order_item_id.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has reason",
      sampleItem.reason.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has request_status",
      sampleItem.request_status !== undefined,
    );
    TestValidator.predicate(
      "cancellation request has created_at",
      sampleItem.created_at.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has updated_at",
      sampleItem.updated_at.length > 0,
    );
    // 6. Verify data isolation - customer_id matches authenticated customer
    TestValidator.equals(
      "cancellation request customer_id matches authenticated customer",
      sampleItem.customer_id,
      customer.id,
    );
    // 7. Verify request status is valid enum value
    TestValidator.predicate(
      "request_status is valid enum",
      ["pending", "approved", "rejected"].includes(sampleItem.request_status),
    );
    // 8. Verify sorting is applied (default DESC on createdAt)
    if (response.data.length > 1) {
      for (let i = 1; i < response.data.length; i++) {
        const prevDate = new Date(response.data[i - 1].created_at);
        const currDate = new Date(response.data[i].created_at);
        // Allow equal dates, only require non-ascending order
        TestValidator.predicate(
          "items are sorted by created_at DESC (or equal)",
          prevDate >= currDate,
        );
      }
    }
  } else {
    // 9. Verify empty response structure when no cancellation requests exist
    TestValidator.equals(
      "empty response has zero records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty response has zero pages",
      response.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty response has empty data array",
      response.data.length,
      0,
    );
  }
}
