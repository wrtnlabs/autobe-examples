import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_refund_requests_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email">
        >() satisfies string as string &
          tags.Format<"email"> &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/join",
        referrer: "https://test.example.com",
        ip: "192.168.1.1",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Verify customer is not banned
  TestValidator.equals("customer not banned", customer.is_banned, false);
  // 3. Test listing refund requests with pagination (page=1)
  const listPage1: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(listPage1);
  // 4. Validate pagination metadata
  TestValidator.equals("page 1 current page", listPage1.pagination.current, 1);
  TestValidator.equals("page 1 limit", listPage1.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 has pagination",
    listPage1.pagination.records >= 0,
  );
  // 5. Validate refund request structure in response data
  if (listPage1.data.length > 0) {
    const firstRefund: IEcommerceMallRefundRequest = listPage1.data[0];
    typia.assert(firstRefund);
    // 6. Verify all required fields exist
    TestValidator.equals("refund has id", typeof firstRefund.id, "string");
    TestValidator.predicate(
      "refund id is uuid",
      /^[0-9a-f-]{36}$/i.test(firstRefund.id),
    );
    TestValidator.equals(
      "refund has reason",
      typeof firstRefund.reason,
      "string",
    );
    TestValidator.predicate(
      "refund reason not empty",
      firstRefund.reason.length > 0,
    );
    TestValidator.equals(
      "refund has request_status",
      typeof firstRefund.request_status,
      "string",
    );
    TestValidator.predicate(
      "refund request_status is valid",
      ["pending", "approved", "rejected"].includes(firstRefund.request_status),
    );
    TestValidator.predicate(
      "refund time_limit is valid",
      firstRefund.time_limit === null ||
        typeof firstRefund.time_limit === "string",
    );
    TestValidator.equals(
      "refund has created_at",
      typeof firstRefund.created_at,
      "string",
    );
    TestValidator.equals(
      "refund has updated_at",
      typeof firstRefund.updated_at,
      "string",
    );
    TestValidator.predicate(
      "refund deleted_at is valid",
      firstRefund.deleted_at === null ||
        typeof firstRefund.deleted_at === "string",
    );
    TestValidator.predicate(
      "refund has order_item",
      typeof firstRefund.order_item === "object",
    );
    // 7. Verify order_item summary structure
    if (firstRefund.order_item !== undefined) {
      TestValidator.equals(
        "order_item has id",
        typeof firstRefund.order_item.id,
        "string",
      );
      TestValidator.equals(
        "order_item has item_status",
        typeof firstRefund.order_item.item_status,
        "string",
      );
      TestValidator.equals(
        "order_item has quantity",
        typeof firstRefund.order_item.quantity,
        "number",
      );
      TestValidator.equals(
        "order_item has unit_price",
        typeof firstRefund.order_item.unit_price,
        "number",
      );
    }
    // 8. Verify deleted_at is null for active refund requests
    TestValidator.equals(
      "active refund deleted_at null",
      firstRefund.deleted_at,
      null,
    );
  }
  // 9. Test filtering by status='pending'
  const pendingList: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingList);
  // 10. Verify status filtering works (if there are pending items)
  if (pendingList.data.length > 0) {
    const firstPending: IEcommerceMallRefundRequest = pendingList.data[0];
    typia.assert(firstPending);
    TestValidator.equals(
      "filtered status is pending",
      firstPending.request_status,
      "pending",
    );
  }
  // 11. Test sorting by createdAt ascending
  const sortedByDateAsc: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);
  // 12. Test sorting by requestStatus descending
  const sortedByStatusDesc: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "requestStatus",
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortedByStatusDesc);
}
