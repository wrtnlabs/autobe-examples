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
 * Test the business logic failure scenario where a super administrator attempts
 * to reject an admin promotion request that has already been processed.
 *
 * Test flow:
 * 1. Create and authenticate a super administrator
 * 2. Create and authenticate a customer
 * 3. Submit an admin promotion request as the customer (status: PENDING)
 * 4. First rejection succeeds - reject the pending request (status: REJECTED)
 * 5. Attempt to reject the same request again
 * 6. Verify the second rejection attempt fails with a conflict error
 *
 * This validates the business rule that each admin request can only be processed once.
 */
export async function test_api_admin_request_rejection_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
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
  // 2. Create and authenticate customer
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
  // 3. Submit admin promotion request
  const adminRequest =
    await api.functional.shoppingMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals("initial status", adminRequest.status, "PENDING");
  // 4. First rejection succeeds
  const rejectedRequest =
    await api.functional.shoppingMall.superAdmin.admin_requests.reject(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          rejectionReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallAdminRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "status after first rejection",
    rejectedRequest.status,
    "REJECTED",
  );
  // 5 & 6. Second rejection attempt should fail with conflict error
  await TestValidator.error("second rejection fails", async () => {
    await api.functional.shoppingMall.superAdmin.admin_requests.reject(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {},
      },
    );
  });
}
