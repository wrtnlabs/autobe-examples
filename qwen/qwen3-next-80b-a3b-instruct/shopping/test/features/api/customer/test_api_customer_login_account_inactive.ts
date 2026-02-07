import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_account_inactive(
  connection: api.IConnection,
): Promise<void> {
  // Customer attempts to log in with valid credentials, but their account has been deactivated (active=false). System returns specific error 'account_inactive' (never 'invalid credentials') to prevent credential enumeration, does not generate any tokens, and does not create a session record.
  // 1. Essential prerequisite: Create an inactive customer account via join (backend auto-generates credentials)
  await authorize_customer_join(connection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Attempt login on the same connection — backend uses internally stored credentials
  // System should return 'account_inactive' error since account is inactive
  await TestValidator.error("account_inactive", async () => {
    await authorize_customer_login(connection, {
      body: {} satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // 3. Verify no authentication token was generated
  // Headers should remain unchanged since authentication failed
  TestValidator.equals(
    "Authorization header not set",
    connection.headers?.Authorization,
    undefined,
  );
}
