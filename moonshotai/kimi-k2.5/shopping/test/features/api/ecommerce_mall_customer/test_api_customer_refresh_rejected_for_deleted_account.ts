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

export async function test_api_customer_refresh_rejected_for_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to create a session with refresh token
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Capture the refresh token for later use
  const refreshToken = authorized.token.refresh;
  // 3. Attempt to refresh tokens using the original refresh_token after account deletion
  // The account is assumed to be soft-deleted (deleted_at set) via another operation
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh token rejected for deleted account",
    async () => {
      await api.functional.ecommerceMall.auth.customer.refresh(
        refreshConnection,
        {
          body: {
            refreshToken,
          } satisfies IEcommerceMallCustomer.IRefresh,
        },
      );
    },
  );
}
