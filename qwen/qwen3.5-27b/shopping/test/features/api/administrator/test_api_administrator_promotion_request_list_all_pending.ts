import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test viewing administrator promotion requests as a super administrator.
 *
 * Validates the complete workflow of browsing administrator promotion requests submitted by customers. Tests that super administrators can view pending requests with proper pagination and all required fields populated correctly.
 *
 * The test verifies that promotion requests contain the actor type, reason text, status, and appropriate null values for unprocessed fields. Ensures that the response structure matches the expected pagination format and that pending requests have null values for processed_by_administrator and rejected_reason.
 *
 * 1. Register and authenticate as a super administrator
 * 2. Register and authenticate as a customer
 * 3. Customer submits an administrator promotion request with justification reason
 * 4. Super administrator retrieves the list of promotion requests
 * 5. Validate response structure, pagination metadata, and request details
 */
export async function test_api_administrator_promotion_request_list_all_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SuperAdmin123",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    },
  });
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "Customer123",
      href: "https://test.com/customer",
      referrer: "https://test.com",
    },
  });
  // 3. Customer submits administrator promotion request
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I want to help manage the platform and ensure fair treatment for all users.",
        },
      },
    );
  typia.assert(request);
  // 4. Super administrator retrieves promotion requests
  const result =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is at least 1",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    result.pagination.pages >= 1,
  );
  // 6. Validate data array contains the submitted request
  TestValidator.predicate("data array is not empty", result.data.length > 0);
  const foundRequest = result.data.find((r) => r.id === request.id);
  TestValidator.predicate(
    "submitted request found in list",
    foundRequest !== undefined,
  );
  // 7. Validate request details
  const safeRequest = typia.assert(foundRequest!);
  TestValidator.equals("request ID matches", safeRequest.id, request.id);
  TestValidator.equals(
    "actor type is customer",
    safeRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "reason matches input",
    safeRequest.reason,
    request.reason,
  );
  TestValidator.equals("status is pending", safeRequest.status, "pending");
  TestValidator.equals(
    "processed_by_administrator is null",
    safeRequest.processed_by_administrator,
    null,
  );
  TestValidator.equals(
    "rejected_reason is null",
    safeRequest.rejected_reason,
    null,
  );
  TestValidator.equals("deleted_at is null", safeRequest.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid date-time",
    safeRequest.created_at !== undefined && safeRequest.created_at.length > 0,
  );
}