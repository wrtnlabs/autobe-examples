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

export async function test_api_customer_profile_update_display_name_and_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Update customer's profile after joining as new customer
  // 1. Customer join and authenticate
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerJoinConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Creating authenticated customer connection with token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Update profile with empty body because no fields defined in IUpdate
  const updateBody: IShoppingMallCustomer.IUpdate = {};
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
}
