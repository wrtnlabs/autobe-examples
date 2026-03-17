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

export async function test_api_customer_refresh_rejected_for_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer to establish test context
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Attempt refresh with invalid token - should fail with 401
  await TestValidator.httpError(
    "invalid refresh token should be rejected with 401",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.customer.refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: "invalid.malformed.token",
          } satisfies IEcommerceMallCustomer.IRefresh,
        },
      );
    },
  );
}
