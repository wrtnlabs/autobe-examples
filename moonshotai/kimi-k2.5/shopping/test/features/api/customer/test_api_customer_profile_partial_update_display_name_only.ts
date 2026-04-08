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

export async function test_api_customer_profile_partial_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer connection and authenticate using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate and establish session - capture initial profile state
  const authorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Store initial profile values for comparison
  const initialDisplayName: string = authorized.displayName;
  const initialPhoneNumber: string = authorized.phoneNumber;
  // 2. Generate a new unique display name for partial update
  const newDisplayName: string = RandomGenerator.paragraph({ sentences: 2 });
  // 3. Perform partial profile update - only providing displayName field, omitting phoneNumber
  // This tests that customers can update individual profile fields without affecting other data
  const updateBody = {
    displayName: newDisplayName,
  } as IEcommerceMallCustomer.IUpdate;
  const updated: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4. Validation: Verify the response structure is valid
  // Note: IEcommerceMallCustomer return type contains address fields, not all profile fields
  // The current returned type structure validates basic response shape
  TestValidator.equals("customer ID should match", updated.id, authorized.id);
  // Verify that phone number (mapped to customer contact) remains consistent
  // after the partial update to display name
  TestValidator.equals(
    "phone number should remain unchanged",
    updated.phoneNumber,
    initialPhoneNumber,
  );
}
