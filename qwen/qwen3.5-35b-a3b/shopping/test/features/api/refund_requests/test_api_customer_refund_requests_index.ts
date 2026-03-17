import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_customer_refund_requests_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with token from registration
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: customerAuth.token.access,
  };
  // 3. Call refund requests index API with no filters to get all requests
  const response =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination has valid current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has valid limit",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.equals("data array exists", response.data.length >= 0, true);
  // 6. Validate each refund request in data array has required fields
  for (const refundRequest of response.data) {
    typia.assert(refundRequest);
    // Validate customer reference matches authenticated customer
    TestValidator.equals(
      "customer reference id matches authenticated customer",
      refundRequest.customer.id,
      customerAuth.id,
    );
    // Validate customer has required fields
    TestValidator.equals(
      "customer has email",
      typeof refundRequest.customer.email,
      "string",
    );
    TestValidator.equals(
      "customer has status",
      typeof refundRequest.customer.status,
      "string",
    );
    // Validate orderItem reference has required fields
    TestValidator.equals(
      "orderItem has id",
      typeof refundRequest.orderItem.id,
      "string",
    );
    TestValidator.equals(
      "orderItem has productName",
      typeof refundRequest.orderItem.productName,
      "string",
    );
    TestValidator.equals(
      "orderItem has quantity",
      typeof refundRequest.orderItem.quantity,
      "number",
    );
    TestValidator.equals(
      "orderItem has unitPrice",
      typeof refundRequest.orderItem.unitPrice,
      "number",
    );
    TestValidator.equals(
      "orderItem has totalPrice",
      typeof refundRequest.orderItem.totalPrice,
      "number",
    );
    TestValidator.equals(
      "orderItem has status",
      typeof refundRequest.orderItem.status,
      "string",
    );
    // Validate orderItem has order reference
    TestValidator.equals(
      "orderItem has order reference",
      typeof refundRequest.orderItem.order,
      "object",
    );
    // Validate refund request timestamps are valid ISO 8601 strings
    TestValidator.predicate(
      "created_at is valid date-time",
      !Number.isNaN(Date.parse(refundRequest.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      !Number.isNaN(Date.parse(refundRequest.updated_at)),
    );
    TestValidator.predicate(
      "delivery_date is valid date-time",
      !Number.isNaN(Date.parse(refundRequest.delivery_date)),
    );
    // Validate submitted_at can be null (not yet submitted) or valid date-time
    if (refundRequest.submitted_at !== null) {
      TestValidator.predicate(
        "submitted_at is valid date-time when not null",
        !Number.isNaN(Date.parse(refundRequest.submitted_at)),
      );
    }
    // Validate decision_at can be null (not yet decided) or valid date-time
    if (refundRequest.decision_at !== null) {
      TestValidator.predicate(
        "decision_at is valid date-time when not null",
        !Number.isNaN(Date.parse(refundRequest.decision_at)),
      );
    }
    // Validate processed_at can be null (not yet processed) or valid date-time
    if (refundRequest.processed_at !== null) {
      TestValidator.predicate(
        "processed_at is valid date-time when not null",
        !Number.isNaN(Date.parse(refundRequest.processed_at)),
      );
    }
    // Validate deleted_at can be null (not deleted) or valid date-time
    if (refundRequest.deleted_at !== null) {
      TestValidator.predicate(
        "deleted_at is valid date-time when not null",
        !Number.isNaN(Date.parse(refundRequest.deleted_at)),
      );
    }
  }
  // 7. Validate default sorting by createdAt descending (most recent first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentItem = response.data[i];
      const nextItem = response.data[i + 1];
      TestValidator.predicate(
        "refund requests sorted by createdAt descending",
        new Date(currentItem.created_at).getTime() >=
          new Date(nextItem.created_at).getTime(),
      );
    }
  }
}
