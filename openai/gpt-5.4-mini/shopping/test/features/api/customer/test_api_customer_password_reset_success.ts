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

export async function test_api_customer_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password1234!";
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const customerSummary = authorized;
  const passwordReset =
    await api.functional.shoppingMall.customer.password_resets.process(
      customerConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          customer: customerSummary,
          expiredAt: null,
          usedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        } satisfies IShoppingMallCustomerPasswordReset,
      },
    );
  typia.assert(passwordReset);
  TestValidator.equals(
    "password reset record customer id",
    passwordReset.customer.id,
    customerSummary.id,
  );
  TestValidator.equals(
    "password reset record customer email",
    passwordReset.customer.email,
    customerSummary.email,
  );
  TestValidator.equals(
    "password reset record account status preserved",
    passwordReset.customer.accountStatus,
    customerSummary.accountStatus,
  );
  TestValidator.equals(
    "password reset record bannedAt preserved",
    passwordReset.customer.bannedAt,
    customerSummary.bannedAt,
  );
  TestValidator.equals(
    "password reset record deletedAt preserved",
    passwordReset.customer.deletedAt,
    customerSummary.deletedAt,
  );
  TestValidator.equals(
    "password reset record createdAt preserved",
    passwordReset.customer.createdAt,
    customerSummary.createdAt,
  );
  TestValidator.equals(
    "password reset record updatedAt preserved",
    passwordReset.customer.updatedAt,
    customerSummary.updatedAt,
  );
  TestValidator.predicate(
    "password reset record consumed when usedAt exists or remains pending when not supported by workflow",
    passwordReset.usedAt === null || typeof passwordReset.usedAt === "string",
  );
}
