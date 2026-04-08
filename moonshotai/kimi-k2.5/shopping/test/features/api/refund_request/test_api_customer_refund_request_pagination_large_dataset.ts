import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Generate order item ID for testing
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test small page size (5)
  const smallPageResult =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.predicate(
    "small page limit respected",
    smallPageResult.pagination.limit === 5,
  );
  // 4. Test default page size (20)
  const defaultPageResult =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(defaultPageResult);
  TestValidator.predicate(
    "default page limit is 20",
    defaultPageResult.pagination.limit === 20,
  );
  // 5. Test large page size (100)
  const largePageResult =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "large page limit respected",
    largePageResult.pagination.limit === 100,
  );
  // 6. Test pagination with page navigation
  const page1Result =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 current value",
    page1Result.pagination.current,
    1,
  );
  // 7. Test requesting page beyond available data
  const beyondPage = page1Result.pagination.pages + 10;
  const beyondResult =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: beyondPage,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(beyondResult);
  TestValidator.predicate(
    "beyond page returns empty data",
    beyondResult.data.length === 0,
  );
  TestValidator.equals(
    "beyond page preserves total records",
    beyondResult.pagination.records,
    page1Result.pagination.records,
  );
  // 8. Validate pagination metadata consistency
  if (page1Result.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1Result.pagination.records / page1Result.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches",
      page1Result.pagination.pages,
      expectedPages,
    );
  }
  // 9. Verify data ordering by createdAt descending
  if (page1Result.data.length > 1) {
    for (let i = 0; i < page1Result.data.length - 1; i++) {
      const current = new Date(page1Result.data[i].createdAt).getTime();
      const next = new Date(page1Result.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `record ${i} createdAt >= record ${i + 1} createdAt`,
        current >= next,
      );
    }
  }
  // 10. Test with status filter and pagination
  const statusResult =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 20,
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(statusResult);
  // Verify filtered results only contain requested status
  for (const item of statusResult.data) {
    TestValidator.equals("filtered status matches", item.status, "pending");
  }
}
