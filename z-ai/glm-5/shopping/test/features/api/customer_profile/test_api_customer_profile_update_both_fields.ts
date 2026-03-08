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

/**
 * Test successful customer profile update when both display name and phone number are provided.
 *
 * **Preconditions:**
 * - Customer account exists and is authenticated
 * - Customer is not banned
 *
 * **Test Steps:**
 * 1. Authenticate as a customer via join endpoint
 * 2. Store original customer data for comparison
 * 3. Call PUT /shoppingMall/customer/profile with valid display_name and phone_number
 * 4. Verify response returns IShoppingMallCustomer with updated displayName and phoneNumber
 * 5. Verify updatedAt timestamp is more recent than createdAt
 * 6. Verify other fields (id, email, banned) remain unchanged
 *
 * **Expected Results:**
 * - Response contains updated display_name and phone_number values
 * - updatedAt timestamp reflects the update time
 * - Other fields remain unchanged
 */
export async function test_api_customer_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - authenticate via join endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  // Store original data for verification
  const originalId = authorizedCustomer.id;
  const originalEmail = authorizedCustomer.email;
  const originalBanned = authorizedCustomer.banned;
  const originalCreatedAt = authorizedCustomer.createdAt;
  // 2. Update profile with both display_name and phone_number
  const updateData = {
    display_name: "John Doe",
    phone_number: "+1-555-123-4567",
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedCustomer =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      { body: updateData },
    );
  typia.assert(updatedCustomer);
  // 3. Verify updated displayName and phoneNumber
  TestValidator.equals(
    "displayName updated",
    updatedCustomer.displayName,
    "John Doe",
  );
  TestValidator.equals(
    "phoneNumber updated",
    updatedCustomer.phoneNumber,
    "+1-555-123-4567",
  );
  // 4. Verify updatedAt is more recent than createdAt
  TestValidator.predicate(
    "updatedAt is more recent than createdAt",
    new Date(updatedCustomer.updatedAt).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  // 5. Verify other fields remain unchanged
  TestValidator.equals("id unchanged", updatedCustomer.id, originalId);
  TestValidator.equals("email unchanged", updatedCustomer.email, originalEmail);
  TestValidator.equals(
    "banned unchanged",
    updatedCustomer.banned,
    originalBanned,
  );
}
