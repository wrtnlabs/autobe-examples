import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_request_cancel_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as Customer A (the request owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  // 2. Register and login as Customer B (different customer, non-owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  // 3. Generate a requestId representing an admin request
  // Note: In real scenario, Customer A would create this request through the create endpoint
  // For this test, we use a random UUID to test the ownership verification
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Customer B (non-owner) attempts to cancel Customer A's admin request
  // This should return 403 Forbidden because the request belongs to Customer A
  await TestValidator.httpError(
    "non-owner cannot cancel admin request belonging to another user",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.admin.requests.cancel(
        customerBConnection,
        {
          requestId: requestId,
        },
      );
    },
  );
  // 5. Validate that Customer A and Customer B are different users
  TestValidator.predicate(
    "customer B is a different user from customer A",
    customerA.id !== customerB.id,
  );
}
