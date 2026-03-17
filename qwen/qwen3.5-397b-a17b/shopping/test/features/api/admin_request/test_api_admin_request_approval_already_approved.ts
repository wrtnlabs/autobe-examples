import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

/**
 * Test business rule validation that prevents approving an already-approved administrator promotion request.
 *
 * This test validates that an administrator promotion request can only be approved once.
 * After a super administrator approves a pending request, any subsequent approval attempt
 * should fail with a 409 Conflict error because the request status is no longer PENDING.
 *
 * Test flow:
 * 1. Register a new customer account
 * 2. Customer submits administrator promotion request with a reason
 * 3. Register a super administrator account and login
 * 4. Super administrator approves the request (first approval should succeed)
 * 5. Super administrator attempts to approve the same request again
 * 6. Validate: Second approval attempt returns 409 Conflict error
 */
export async function test_api_admin_request_approval_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer who will request administrator promotion
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Customer submits administrator promotion request
  const adminRequest =
    await api.functional.shoppingMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Register super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 4. Super administrator approves the request (first approval should succeed)
  const approvedRequest =
    await api.functional.shoppingMall.superAdmin.admin_requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // Validate first approval succeeded
  TestValidator.equals(
    "request status after approval",
    approvedRequest.status,
    "APPROVED",
  );
  TestValidator.equals(
    "request id matches",
    approvedRequest.id,
    adminRequest.id,
  );
  // 5. Super administrator attempts to approve the same request again
  // This should fail with 409 Conflict because request is already approved
  await TestValidator.error("duplicate approval should fail", async () => {
    await api.functional.shoppingMall.superAdmin.admin_requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  });
}
