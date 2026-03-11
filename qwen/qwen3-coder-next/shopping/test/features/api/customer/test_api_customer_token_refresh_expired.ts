import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and get tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(registered);
  // 2. Simulate expired refresh token by using a modified token
  // (The server rejects tokens that don't match the stored refresh token)
  await TestValidator.error("expired refresh token returns 401", async () => {
    await api.functional.ecommerceMall.auth.customer.refresh(
      {
        host: connection.host,
        headers: { Authorization: "Bearer " + registered.refresh_token },
      },
      {
        body: {
          refresh_token: registered.refresh_token + "tampered-value",
        } satisfies IEcommerceMallCustomer.IRefresh,
      },
    );
  });
}