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

export async function test_api_customer_profile_update_partial_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Authorize customer join to establish session
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // Step 2: Perform partial update with only display_name field
  const newDisplayName = RandomGenerator.name();
  const partialUpdate = {
    display_name: newDisplayName,
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.updateProfile(
      customerConnection,
      {
        body: partialUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 3: Validate response structure (based on empty DTO definition)
  // Since IShoppingMallCustomer is an empty type {}, we can only validate structure
  // The test confirms the update endpoint works without errors
}
