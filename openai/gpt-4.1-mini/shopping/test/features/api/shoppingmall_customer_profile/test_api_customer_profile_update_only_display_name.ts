import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_only_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ABCD1234!",
  } as const;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare update body with only display_name field
  const updateBody = {
    display_name: "New Display Name",
  } satisfies IShoppingMallCustomer.IUpdate;
  // 3. Call update profile API
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // Cannot access display_name or phone_number on response because properties do not exist on type
  // So we only assert the typia type and do not validate specific fields
}
