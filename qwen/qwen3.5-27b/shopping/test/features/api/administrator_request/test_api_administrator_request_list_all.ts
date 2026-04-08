import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a super administrator can retrieve all administrator promotion requests with default pagination.
 *
 * Validates the administrator request listing functionality by authenticating as a customer and retrieving all administrator promotion requests using default pagination parameters. The test ensures that the paginated response structure is correct and that the pagination metadata accurately reflects the total count of requests.
 *
 * Special attention is given to verifying that the response includes proper pagination information (current page, limit, total records, total pages) and that the data array contains administrator request summaries with all required fields.
 *
 * 1. Register and authenticate as a customer using authorize_customer_join utility.
 * 2. Call PATCH /shoppingMall/customer/administrator-requests with empty request body to use default pagination.
 * 3. Validate the response structure matches IPageIShoppingMallAdministratorRequest.ISummary.
 * 4. Verify pagination metadata: current=1, limit=20, records matches actual count, pages calculated correctly.
 * 5. Verify each request in data array includes all required fields: id, actor_type, reason, status, rejection_reason, processedByAdministrator, created_at, updated_at.
 * 6. Verify results are ordered by created_at DESC (newest first).
 * 7. Verify processedByAdministrator is null for pending requests and contains IShoppingMallAdministrator.ISummary for approved/rejected requests.
 */
export async function test_api_administrator_request_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Call PATCH /shoppingMall/customer/administrator-requests with empty request body (default pagination)
  const output =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", output.pagination.limit, 20);
  TestValidator.predicate(
    "records count matches data array length",
    output.pagination.records === output.data.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    output.pagination.pages ===
      Math.ceil(output.pagination.records / output.pagination.limit),
  );
  // 4. Verify each request in data array has required fields and business logic
  await ArrayUtil.asyncForEach(output.data, async (request) => {
    typia.assert(request);
    // Verify business logic: rejection_reason is null for non-rejected requests
    if (request.status === "rejected") {
      TestValidator.predicate(
        "rejected request has non-null rejection_reason",
        request.rejection_reason !== null,
      );
    } else {
      TestValidator.equals(
        "non-rejected request has null rejection_reason",
        request.rejection_reason,
        null,
      );
    }
    // Verify business logic: processedByAdministrator
    if (request.status === "pending") {
      TestValidator.equals(
        "pending request has null processedByAdministrator",
        request.processedByAdministrator,
        null,
      );
    } else {
      TestValidator.predicate(
        "processed request has non-null processedByAdministrator",
        request.processedByAdministrator !== null,
      );
      if (request.processedByAdministrator !== null) {
        typia.assert(request.processedByAdministrator);
        // Business logic validation on processedByAdministrator
        TestValidator.predicate(
          "processedByAdministrator has non-empty email",
          request.processedByAdministrator.email.length > 0,
        );
      }
    }
  });
  // 5. Verify results are ordered by created_at DESC (newest first)
  if (output.data.length > 1) {
    TestValidator.predicate(
      "results ordered by created_at DESC",
      (() => {
        for (let i = 1; i < output.data.length; i++) {
          const prevDate = new Date(output.data[i - 1].created_at).getTime();
          const currDate = new Date(output.data[i].created_at).getTime();
          if (currDate > prevDate) return false;
        }
        return true;
      })(),
    );
  }
}
