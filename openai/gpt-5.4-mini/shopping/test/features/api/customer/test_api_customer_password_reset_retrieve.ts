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

export async function test_api_customer_password_reset_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  try {
    const first = await api.functional.shoppingMall.customer.password_resets.at(
      customerConnection,
      {
        passwordResetId,
      },
    );
    typia.assert(first);
    const second =
      await api.functional.shoppingMall.customer.password_resets.at(
        customerConnection,
        {
          passwordResetId,
        },
      );
    typia.assert(second);
    TestValidator.equals(
      "password reset record is stable across reads",
      first,
      second,
    );
    TestValidator.predicate(
      "password reset id is a uuid",
      () => first.id === passwordResetId,
    );
    TestValidator.predicate(
      "password reset customer summary exposes safe identity",
      () => {
        const customer = first.customer;
        return (
          typeof customer.id === "string" &&
          typeof customer.email === "string" &&
          typeof customer.accountStatus === "string" &&
          (customer.bannedAt === null ||
            typeof customer.bannedAt === "string") &&
          (customer.deletedAt === null ||
            typeof customer.deletedAt === "string") &&
          typeof customer.createdAt === "string" &&
          typeof customer.updatedAt === "string"
        );
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError && error.status === 404) return;
    throw error;
  }
}
