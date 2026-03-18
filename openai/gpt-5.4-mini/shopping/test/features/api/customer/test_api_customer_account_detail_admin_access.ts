import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_account_detail_admin_access(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const output = await api.functional.shoppingMall.administrator.customers.at(
    adminConnection,
    {
      customerId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "customer resource is single object",
    typeof output,
    "object",
  );
  TestValidator.predicate("customer id exists", output.id.length > 0);
  TestValidator.predicate("customer email exists", output.email.length > 0);
  TestValidator.predicate(
    "customer account status exists",
    output.accountStatus.length > 0,
  );
  TestValidator.predicate(
    "customer createdAt exists",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "customer updatedAt exists",
    output.updatedAt.length > 0,
  );
  TestValidator.equals(
    "customer bannedAt is nullable",
    output.bannedAt,
    output.bannedAt ?? null,
  );
  TestValidator.equals(
    "customer deletedAt is nullable",
    output.deletedAt,
    output.deletedAt ?? null,
  );
  if (output.profile !== null) {
    TestValidator.predicate(
      "profile displayName exists",
      output.profile.displayName.length > 0,
    );
    TestValidator.predicate(
      "profile phoneNumber exists",
      output.profile.phoneNumber.length > 0,
    );
  }
}
