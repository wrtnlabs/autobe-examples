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

export async function test_api_customer_login_email_not_verified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register unverified customer
  const joinConnection: api.IConnection = { host: connection.host };
  const sampleEmail = typia.random<string & tags.Format<"email">>();
  const samplePassword = "SecurePassword123!";
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {
      email: sampleEmail,
      password: samplePassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Attempt login with unverified credentials using the original email
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("email_not_verified", async () => {
    await authorize_customer_login(loginConnection, {
      body: {
        email: sampleEmail,
        password: samplePassword,
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
