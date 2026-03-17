import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register customer to get authenticated (profile auto-created during registration)
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Step 2: Prepare profile update data with valid displayName (2-100 chars) and phoneNumber
  const updateBody = {
    displayName: RandomGenerator.name(2).slice(0, 100),
    phoneNumber: "+82-10-1234-5678",
  } satisfies IEcommerceMallCustomer.IUpdate;
  // Step 3: Update profile
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // Step 4: Verify updated values match input (business logic validation)
  TestValidator.equals(
    "displayName updated correctly",
    updatedProfile.displayName,
    updateBody.displayName,
  );
  TestValidator.equals(
    "phoneNumber updated correctly",
    updatedProfile.phoneNumber,
    updateBody.phoneNumber,
  );
  // Step 5: Verify profile belongs to the authenticated customer
  TestValidator.equals(
    "customerId matches authenticated user",
    updatedProfile.customerId,
    authorized.id,
  );
}
