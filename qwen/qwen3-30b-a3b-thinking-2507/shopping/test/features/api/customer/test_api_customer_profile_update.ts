import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Create customer account (join)
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 3: Generate valid profile update data
  const validDisplayName =
    RandomGenerator.alphabets(5).toUpperCase() + RandomGenerator.alphabets(2);
  const validPhone = RandomGenerator.mobile();
  // Step 4: Update customer profile
  const updatedProfile: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: validDisplayName,
          phone: validPhone,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 5: Verify the successful update with test validator
  TestValidator.equals(
    "display name match after update",
    updatedProfile.name,
    validDisplayName,
  );
  TestValidator.equals(
    "phone match after update",
    updatedProfile.phone,
    validPhone,
  );
}
