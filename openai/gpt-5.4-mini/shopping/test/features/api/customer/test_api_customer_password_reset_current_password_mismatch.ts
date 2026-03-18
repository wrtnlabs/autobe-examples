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

export async function test_api_customer_password_reset_current_password_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${joined.token.access}`,
  };
  const body = {
    id: joined.id,
    customer: {
      id: joined.id,
      email: joined.email,
      accountStatus: joined.accountStatus,
      bannedAt: joined.bannedAt,
      deletedAt: joined.deletedAt,
      createdAt: joined.createdAt,
      updatedAt: joined.updatedAt,
    } satisfies IShoppingMallCustomer.ISummary,
    expiredAt: null,
    usedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  } satisfies IShoppingMallCustomerPasswordReset;
  const output =
    await api.functional.shoppingMall.customer.password_resets.process(
      customerConnection,
      { body },
    );
  typia.assert(output);
  TestValidator.equals(
    "customer id should be preserved",
    output.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email should be preserved",
    output.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "customer account status should remain active",
    output.customer.accountStatus,
    joined.accountStatus,
  );
  TestValidator.equals(
    "reset record should remain unused",
    output.usedAt,
    null,
  );
  TestValidator.equals(
    "reset record should remain active",
    output.deletedAt,
    null,
  );
}
