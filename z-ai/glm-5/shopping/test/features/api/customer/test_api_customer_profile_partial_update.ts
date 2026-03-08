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

export async function test_api_customer_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      displayName: null,
      phoneNumber: null,
    },
  });
  typia.assert(authResult);
  // 2. Update profile with only display_name (partial update)
  const newDisplayName = RandomGenerator.name();
  const updatedCustomer =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // 3. Validate partial update - only display_name changed
  TestValidator.equals(
    "display name updated",
    updatedCustomer.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number unchanged",
    updatedCustomer.phoneNumber,
    null,
  );
  TestValidator.equals(
    "customer id preserved",
    updatedCustomer.id,
    authResult.id,
  );
}
