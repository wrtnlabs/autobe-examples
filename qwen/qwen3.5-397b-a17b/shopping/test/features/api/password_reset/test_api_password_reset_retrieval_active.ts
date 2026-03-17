import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminCredentials);
  // 2. Create a customer account (who would request password reset in real scenario)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = await authorize_customer_join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerCredentials);
  // 3. Generate a reset ID for testing (simulates existing password reset request)
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve password reset record as administrator
  const passwordReset =
    await api.functional.shoppingMall.customer.password_resets.at(
      adminConnection,
      {
        resetId: resetId,
      },
    );
  typia.assert(passwordReset);
  // 5. Validate consumed_at is null indicating reset has not been used (active status)
  TestValidator.equals(
    "consumed_at is null (not consumed)",
    passwordReset.consumed_at,
    null,
  );
  // 6. Validate customer object is present with expected structure
  TestValidator.predicate(
    "customer object exists",
    () => passwordReset.customer !== undefined,
  );
  TestValidator.equals(
    "customer email matches",
    passwordReset.customer.email,
    customerCredentials.email,
  );
  // 7. Verify response structure matches expected DTO (no sensitive token data exposed)
  const resetKeys = Object.keys(passwordReset);
  TestValidator.predicate("no sensitive token data exposed", () => {
    return !resetKeys.includes("token") && !resetKeys.includes("token_hash");
  });
}
