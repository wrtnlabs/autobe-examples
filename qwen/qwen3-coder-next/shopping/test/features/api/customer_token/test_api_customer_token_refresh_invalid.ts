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

export async function test_api_customer_token_refresh_invalid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer session (get valid tokens)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Create new connection with valid tokens
  const validTokenConnection: api.IConnection = { host: connection.host };
  validTokenConnection.headers = {
    authorization: authorized.token.access,
  };
  // 3. Test invalid refresh token scenarios
  // 3.1. Completely invalid token format (random string)
  await TestValidator.error(
    "should reject completely invalid token format",
    async () => {
      await api.functional.shoppingMall.auth.customer.refresh(
        validTokenConnection,
        {
          body: {
            refresh: "invalid-token-random-string-12345",
          } satisfies IShoppingMallCustomer.IRefresh,
        },
      );
    },
  );
  // 3.2. Tampered/modified refresh token (malformed JWT structure)
  await TestValidator.error(
    "should reject tampered/modified refresh token",
    async () => {
      await api.functional.shoppingMall.auth.customer.refresh(
        validTokenConnection,
        {
          body: {
            refresh: "invalid.token.structure",
          } satisfies IShoppingMallCustomer.IRefresh,
        },
      );
    },
  );
  // 3.3. Token from a different customer session (generate another customer)
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_customer_join(
    anotherCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(anotherAuthorized);
  await TestValidator.error(
    "should reject token from different customer session",
    async () => {
      await api.functional.shoppingMall.auth.customer.refresh(
        validTokenConnection,
        {
          body: {
            refresh: anotherAuthorized.token.refresh,
          } satisfies IShoppingMallCustomer.IRefresh,
        },
      );
    },
  );
  // 3.4. Empty refresh token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.shoppingMall.auth.customer.refresh(
      validTokenConnection,
      {
        body: {
          refresh: "",
        } satisfies IShoppingMallCustomer.IRefresh,
      },
    );
  });
  // 3.5. Null/undefined refresh token simulation (invalid type)
  // Note: This will cause compilation error if we try to pass wrong type,
  // so we use valid types that will fail at runtime validation
  await TestValidator.error(
    "should reject malformed token structure",
    async () => {
      await api.functional.shoppingMall.auth.customer.refresh(
        validTokenConnection,
        {
          body: {
            refresh: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload",
          } satisfies IShoppingMallCustomer.IRefresh,
        },
      );
    },
  );
  // 4. Verify original session is still valid (no pollution)
  const refreshed = await authorize_customer_refresh(validTokenConnection, {
    body: {
      refresh: authorized.token.refresh,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshed.token.access,
    authorized.token.access,
  );
}
