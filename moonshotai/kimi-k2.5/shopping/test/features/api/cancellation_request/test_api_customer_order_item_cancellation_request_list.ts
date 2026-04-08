import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_order_item_cancellation_request_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/home",
    },
  });
  // 2. Create a cancellation request as prerequisite data
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Changed my mind about this purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  const orderItemId = cancellationRequest.orderItem.id;
  // 3. Call the target endpoint to list cancellation requests for the order item
  const response: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate the created cancellation request is in the list
  const foundRequest = response.data.find(
    (item) => item.id === cancellationRequest.id,
  );
  TestValidator.predicate(
    "created cancellation request found in list",
    !!foundRequest,
  );
  if (foundRequest) {
    TestValidator.equals(
      "request id matches",
      foundRequest.id,
      cancellationRequest.id,
    );
    TestValidator.equals(
      "request status matches",
      foundRequest.status,
      cancellationRequest.status,
    );
    TestValidator.equals(
      "request reason matches",
      foundRequest.reason,
      cancellationRequest.reason,
    );
    TestValidator.equals(
      "order item id matches",
      foundRequest.orderItem.id,
      orderItemId,
    );
  }
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is correct", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is at least 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    response.pagination.pages >= 1,
  );
  // 6. Test filtering by status
  const filteredResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Filtered results should not contain pending requests
  const hasPendingInFiltered = filteredResponse.data.some(
    (item) => item.status === "pending",
  );
  TestValidator.predicate(
    "filtered list should not contain pending status",
    !hasPendingInFiltered,
  );
}
