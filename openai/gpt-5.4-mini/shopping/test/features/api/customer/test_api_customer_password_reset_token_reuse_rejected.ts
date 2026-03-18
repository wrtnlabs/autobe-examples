import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_token_reuse_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const passwordReset = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer: {
      id: authorized.id,
      email: authorized.email,
      accountStatus: authorized.accountStatus,
      bannedAt: authorized.bannedAt,
      deletedAt: authorized.deletedAt,
      createdAt: authorized.createdAt,
      updatedAt: authorized.updatedAt,
    },
    expiredAt: null,
    usedAt: null,
    createdAt: authorized.createdAt,
    updatedAt: authorized.updatedAt,
    deletedAt: null,
  } satisfies IShoppingMallCustomerPasswordReset;
  const first =
    await api.functional.shoppingMall.customer.password_resets.process(
      customerConnection,
      {
        body: passwordReset,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "first reset response should match submitted token record id",
    first.id,
    passwordReset.id,
  );
  TestValidator.equals(
    "first reset response should keep same customer id",
    first.customer.id,
    authorized.id,
  );
  await TestValidator.error(
    "reuse of consumed password reset token must be rejected",
    async () => {
      await api.functional.shoppingMall.customer.password_resets.process(
        customerConnection,
        {
          body: passwordReset,
        },
      );
    },
  );
}
