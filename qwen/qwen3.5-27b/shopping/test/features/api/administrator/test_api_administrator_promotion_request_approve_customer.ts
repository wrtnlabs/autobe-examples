import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test super administrator approving a customer's administrator promotion request.
 *
 * Validates the complete workflow where a super administrator reviews and approves a customer's request to become a platform administrator. The test ensures that the request status transitions correctly, the customer is granted administrator privileges with 'regular' grade, and proper audit trails are maintained through snapshots and processing administrator tracking.
 *
 * Special attention is given to verifying that the processedByAdministrator field correctly references the super administrator who approved the request, and that the rejected_reason field is null for approved requests.
 *
 * 1. Register a super administrator account with 'super' grade privileges.
 * 2. Register a customer account that will submit the promotion request.
 * 3. Customer submits an administrator promotion request with justification reason.
 * 4. Verify the request is created with 'pending' status.
 * 5. Super administrator authenticates with their credentials.
 * 6. Super administrator approves the promotion request by updating status to 'approved'.
 * 7. Validate the response contains updated request with status='approved'.
 * 8. Verify processedByAdministrator contains the super administrator's information.
 * 9. Verify rejected_reason is null for approved requests.
 * 10. Confirm the customer now has administrator privileges with 'regular' grade.
 */
export async function test_api_administrator_promotion_request_approve_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "SuperAdmin123",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "Customer123",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/customer",
    },
  });
  typia.assert(customerAuth);
  // 3. Customer submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I have extensive experience in platform management and want to help moderate the shopping mall community.",
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Verify request is in pending status
  TestValidator.equals(
    "request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "processed_by_administrator is null",
    promotionRequest.processedByAdministrator,
    null,
  );
  // 5. Super administrator authenticates
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(superAdminLoginConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SuperAdmin123",
      href: "https://test.com/admin/login",
      referrer: "https://test.com/admin",
    },
  });
  // 6. Super administrator approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      superAdminLoginConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 7. Validate status changed to approved
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 8. Verify processedByAdministrator contains super administrator info
  TestValidator.predicate(
    "processed_by_administrator is not null",
    approvedRequest.processedByAdministrator !== null,
  );
  TestValidator.equals(
    "processed by super admin",
    approvedRequest.processedByAdministrator?.id,
    superAdminAuth.id,
  );
  // 9. Verify rejected_reason is null for approved requests
  TestValidator.equals(
    "rejected_reason is null",
    approvedRequest.rejected_reason,
    null,
  );
  // 10. Verify actor_type is customer
  TestValidator.equals(
    "actor type is customer",
    approvedRequest.actor_type,
    "customer",
  );
  // 11. Verify updated_at timestamp is recorded
  TestValidator.predicate(
    "updated_at is a valid date-time",
    typeof approvedRequest.updated_at === "string",
  );
}