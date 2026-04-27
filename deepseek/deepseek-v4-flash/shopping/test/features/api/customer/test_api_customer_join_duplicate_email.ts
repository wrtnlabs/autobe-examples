import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer join with a unique email
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    },
  });
  typia.assert(authorized);
  // 2. Attempt to join with the same email - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate email registration",
    409,
    async () => {
      await api.functional.eCommerceMall.auth.customer.join(
        { host: connection.host },
        {
          body: {
            email,
            password: typia.random<string & tags.Format<"password">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: null,
          } satisfies IECommerceMallCustomer.IJoin,
        },
      );
    },
  );
  // 3. Verify original account is still functional by logging in
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IECommerceMallCustomer.ILogin,
  });
  typia.assert(loginResult);
}