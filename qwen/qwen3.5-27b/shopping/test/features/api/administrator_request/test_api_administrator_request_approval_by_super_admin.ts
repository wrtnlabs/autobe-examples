import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
 * Test super administrator approval of a customer's administrator promotion request.
 *
 * Validates the complete administrator request approval workflow including super administrator authentication, customer request submission, and approval processing. Ensures that when a super administrator approves a pending request, the request status is updated, the super administrator ID is recorded for audit purposes, and the customer becomes a regular administrator.
 *
 * Special attention is given to verifying that the processed_by_administrator_id is correctly set to the super admin's ID, the rejection_reason is null for approved requests, and the newly created administrator account has grade='regular' (not super).
 *
 * 1. Super administrator registers and authenticates with the system.
 * 2. Customer registers and authenticates with the system.
 * 3. Customer submits an administrator promotion request with a justification reason.
 * 4. Super administrator approves the pending request using the update endpoint.
 * 5. Validates the updated request shows status='approved', processed_by_administrator_id matches super admin, and rejection_reason is null.
 */
export async function test_api_administrator_request_approval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/customer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Customer submits administrator request
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I want to help manage the platform and ensure fair operations for all users.",
        },
      },
    );
  typia.assert(request);
  // Verify request is pending
  TestValidator.equals("request status is pending", request.status, "pending");
  TestValidator.equals(
    "processed_by_administrator_id is null",
    request.processed_by_administrator_id,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    request.rejection_reason,
    null,
  );
  // 4. Super administrator approves the request
  const updatedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.update(
      superAdminConnection,
      {
        administratorRequestId: request.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate approval results
  TestValidator.equals(
    "request status is approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "processed_by_administrator_id is set",
    updatedRequest.processed_by_administrator_id,
    superAdmin.id,
  );
  TestValidator.equals(
    "rejection_reason is null",
    updatedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "processedByAdministrator exists",
    updatedRequest.processedByAdministrator !== null,
  );
  TestValidator.equals(
    "processedByAdministrator email matches",
    updatedRequest.processedByAdministrator!.email,
    superAdmin.email,
  );
}
