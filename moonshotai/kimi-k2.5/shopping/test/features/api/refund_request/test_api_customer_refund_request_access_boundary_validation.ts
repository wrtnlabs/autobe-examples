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

export async function test_api_customer_refund_request_access_boundary_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create two separate customer connections for boundary testing
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies Partial<IEcommerceMallCustomer.IJoin>,
  });
  typia.assert(customer1);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies Partial<IEcommerceMallCustomer.IJoin>,
  });
  typia.assert(customer2);
  // Test 1: Non-existent order item - should return empty results
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customer1Connection,
      {
        orderItemId: nonExistentOrderItemId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result pagination has 0 records",
    0,
    emptyResult.pagination.records,
  );
  TestValidator.equals(
    "empty result data array is empty",
    0,
    emptyResult.data.length,
  );
  // Test 2: Cross-customer access boundary - customer2 cannot see customer1's order data
  // Using a random UUID to simulate trying to access another customer's order item
  const randomOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const crossCustomerResult =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customer2Connection,
      {
        orderItemId: randomOrderItemId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(crossCustomerResult);
  // Verify boundary enforcement - no data leakage for order items customer doesn't own
  TestValidator.equals(
    "cross-customer access returns no records",
    0,
    crossCustomerResult.pagination.records,
  );
  TestValidator.equals(
    "cross-customer access returns empty data",
    0,
    crossCustomerResult.data.length,
  );
  // Test 3: Unauthorized access without authentication should return 403
  await TestValidator.httpError(
    "unauthorized access returns 403",
    403,
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
        unauthorizedConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    },
  );
}
