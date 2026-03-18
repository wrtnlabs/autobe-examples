import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_deleted_account_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const profile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  TestValidator.equals(
    "customer profile owner matches",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer profile email matches",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile is attached to current account",
    profile.customer.deletedAt,
    null,
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "anonymous customer profile access is rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.profile.at(
        unauthorizedConnection,
      );
    },
  );
}
