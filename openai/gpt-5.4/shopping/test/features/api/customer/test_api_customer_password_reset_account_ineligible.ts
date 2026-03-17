import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_account_ineligible(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const originalId = joined.id;
  const originalEmail = joined.email;
  const publicConnection: api.IConnection = { host: connection.host };
  const attempts = [
    {
      title:
        "rejects password reset with non-existent token for modeled banned-account recovery",
      body: {
        token: typia.random<string>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallCustomerPasswordReset.IUpdate,
    },
    {
      title:
        "rejects password reset with non-existent token for modeled deleted-account recovery",
      body: {
        token: typia.random<string>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallCustomerPasswordReset.IUpdate,
    },
  ] as const;
  for (const attempt of attempts) {
    await TestValidator.error(attempt.title, async () => {
      await api.functional.shoppingMall.customer.passwordResets.update(
        publicConnection,
        {
          body: attempt.body,
        },
      );
    });
  }
  TestValidator.equals(
    "original customer id is preserved locally",
    originalId,
    joined.id,
  );
  TestValidator.equals(
    "original customer email is preserved locally",
    originalEmail,
    joined.email,
  );
}
