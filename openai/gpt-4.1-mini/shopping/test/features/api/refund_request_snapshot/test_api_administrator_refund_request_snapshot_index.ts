import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_administrator_refund_request_snapshot_index(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test the retrieval of refund request snapshots for administrative users with pagination and filtering.
  // 1. Successfully retrieve a paginated list of refund request snapshots with no filters.
  // 2. Filter refund request snapshots by status and date ranges.
  // 3. Handle empty results when no matching snapshots exist.
  // 4. Ensure only authenticated administrators can access the endpoint.
  // 5. Verify the response structure matches the paginated summary schema for refund request snapshots.
  // 1. Setup: Create administrator account and login
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies IShoppingMallAdministrator.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: adminJoinInput });
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IShoppingMallAdministrator.ILogin;
  const adminAuthorized = await authorize_administrator_login(adminConnection, {
    body: adminLoginInput,
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Setup: Create customer and login
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 3. Create an order item for the customer
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(orderItem);
  // 4. Create a refund request for the order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderItemId: orderItem.id,
          requestReason: "Test refund request reason",
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Test Case: Retrieve refund request snapshots without filters
  let response =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: null,
          refundRequestId: null,
          createdAtStart: null,
          createdAtEnd: null,
          updatedAtStart: null,
          updatedAtEnd: null,
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "has pagination info",
    response.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // 6. Test Case: Filter by status (using status from the created refundRequest)
  response =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.index(
      adminConnection,
      {
        body: {
          status: refundRequest.status,
          page: 1,
          limit: 10,
          refundRequestId: null,
          createdAtStart: null,
          createdAtEnd: null,
          updatedAtStart: null,
          updatedAtEnd: null,
        },
      },
    );
  typia.assert(response);
  response.data.forEach((item) => {
    TestValidator.equals(
      "item status matches filter",
      item.status,
      refundRequest.status,
    );
  });
  // 7. Test Case: Filter by date range (creation date)
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString();
  response =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.index(
      adminConnection,
      {
        body: {
          createdAtStart: startDate,
          createdAtEnd: endDate,
          page: 1,
          limit: 10,
          status: null,
          refundRequestId: null,
          updatedAtStart: null,
          updatedAtEnd: null,
        },
      },
    );
  typia.assert(response);
  // 8. Test Case: Empty result handling (filter with impossible refundRequestId)
  response =
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.index(
      adminConnection,
      {
        body: {
          refundRequestId: "00000000-0000-0000-0000-000000000000",
          page: 1,
          limit: 10,
          status: null,
          createdAtStart: null,
          createdAtEnd: null,
          updatedAtStart: null,
          updatedAtEnd: null,
        },
      },
    );
  typia.assert(response);
  TestValidator.equals("empty result data length", response.data.length, 0);
  // 9. Test Case: Access control - unauthorized access rejected
  // Use new connection without auth
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.administrator.refundRequestSnapshots.index(
      unauthorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  });
}
