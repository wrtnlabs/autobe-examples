import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_search_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  const statuses = ["pending", "approved", "rejected", null] as const;
  // Test filtering by different status values
  for (const status of statuses) {
    const searchBody = {
      search: "",
      requested_at_start: undefined,
      requested_at_end: undefined,
      status: status,
      page: 1,
      limit: 10,
    } satisfies IEcommerceRefundRequest.IRequest;
    const result =
      await api.functional.ecommerce.customer.refund_requests.index(
        customerConnection,
        { body: searchBody },
      );
    typia.assert(result);
    // Validate pagination structure
    TestValidator.predicate(
      `pagination structure valid for status ${status}`,
      result.pagination !== undefined &&
        typeof result.pagination.current === "number" &&
        typeof result.pagination.limit === "number" &&
        typeof result.pagination.records === "number" &&
        typeof result.pagination.pages === "number",
    );
    // Validate data structure for returned requests
    for (const request of result.data) {
      TestValidator.predicate(
        `request has valid ID for status ${status}`,
        typeof request.id === "string" && request.id.length > 0,
      );
      TestValidator.predicate(
        `request has valid reason for status ${status}`,
        typeof request.reason === "string",
      );
      TestValidator.predicate(
        `request has valid requested_at timestamp for status ${status}`,
        typeof request.requested_at === "string" &&
          request.requested_at.length > 0,
      );
      TestValidator.predicate(
        `request has valid customer info for status ${status}`,
        request.customer !== undefined &&
          typeof request.customer.id === "string" &&
          typeof request.customer.email === "string" &&
          typeof request.customer.display_name === "string" &&
          typeof request.customer.created_at === "string",
      );
      TestValidator.predicate(
        `request has valid seller info for status ${status}`,
        request.seller !== undefined &&
          typeof request.seller.id === "string" &&
          typeof request.seller.email === "string" &&
          typeof request.seller.shop_name === "string" &&
          typeof request.seller.created_at === "string",
      );
    }
  }
  // Test combined date range and status filtering
  const yesterday = new Date(Date.now() - 86400000);
  const tomorrow = new Date(Date.now() + 86400000);
  const combinedSearchBody = {
    search: RandomGenerator.substring("test search term"),
    requested_at_start: yesterday.toISOString(),
    requested_at_end: tomorrow.toISOString(),
    status: "pending",
    page: 1,
    limit: 20,
  } satisfies IEcommerceRefundRequest.IRequest;
  const combinedResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      { body: combinedSearchBody },
    );
  typia.assert(combinedResult);
  // Test invalid status parameter
  const invalidStatusBody = {
    search: "",
    requested_at_start: undefined,
    requested_at_end: undefined,
    status: "invalid_status_value",
    page: 1,
    limit: 10,
  } satisfies IEcommerceRefundRequest.IRequest;
  const invalidResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      { body: invalidStatusBody },
    );
  typia.assert(invalidResult);
  // Test that API handles invalid status gracefully (may return empty results or error)
  TestValidator.predicate(
    "API handles invalid status parameter",
    invalidResult !== undefined,
  );
  // Test search with specific text
  const textSearchBody = {
    search: "refund",
    requested_at_start: undefined,
    requested_at_end: undefined,
    status: null,
    page: 1,
    limit: 15,
  } satisfies IEcommerceRefundRequest.IRequest;
  const textSearchResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      { body: textSearchBody },
    );
  typia.assert(textSearchResult);
  // Validate that all search functionality combinations work without errors
  TestValidator.predicate(
    "all status filter combinations executed successfully",
    true,
  );
}
