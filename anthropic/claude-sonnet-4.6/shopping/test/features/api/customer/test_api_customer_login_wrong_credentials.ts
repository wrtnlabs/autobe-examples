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

export async function test_api_customer_login_wrong_credentials(
  connection: api.IConnection,
): Promise<void> {
  // ─── Test Case A: Non-existent email login ───────────────────────────────
  // Generate a random email that is guaranteed not to exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(16);
  // Attempt login with non-existent email — should throw 401
  const connectionA: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-existent email login must fail with 401",
    401,
    async () => {
      await authorize_customer_login(connectionA, {
        body: {
          email: nonExistentEmail,
          password: randomPassword,
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
  // ─── Test Case B: Correct email, wrong password ───────────────────────────
  // First, register a real customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const registerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(registerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Attempt login with the correct email but a wrong password — should throw 401
  const connectionB: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "correct email wrong password must fail with 401",
    401,
    async () => {
      await authorize_customer_login(connectionB, {
        body: {
          email: customerEmail,
          password: "WRONG_" + RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
