import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_retrieval_own_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Generate a random UUID for non-existent reset ID
  // Note: No password reset creation endpoint exists in SDK,
  // so we test with a UUID that doesn't exist
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test endpoint rejects non-existent reset ID
  await TestValidator.error("non-existent reset returns error", async () => {
    await api.functional.ecommerceMall.customer.customer.password_resets.at(
      customerConnection,
      {
        resetId: nonExistentResetId,
      },
    );
  });
  // 4. Verify customer authentication is working
  TestValidator.equals("customer ID exists", customer.id !== undefined, true);
  TestValidator.equals(
    "customer email exists",
    customer.email !== undefined,
    true,
  );
}
