import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer profile update with partial data (display name only).
 * Verifies that omitting phoneNumber preserves the existing phone number.
 */
export async function test_api_customer_profile_update_without_phone(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join customer and get authentication token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Create customer-specific connection with token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResponse.token.access },
  };
  // Step 3: Get current profile to capture original phone number
  const currentProfile: IEcommerceMallCustomerProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(currentProfile);
  const originalDisplayName: string = currentProfile.displayName;
  const originalPhoneNumber:
    | string
    | null
    | undefined = currentProfile.phoneNumber;
  TestValidator.predicate(
    "customer has initial phone number",
    originalPhoneNumber !== null && originalPhoneNumber !== undefined,
  );
  // Step 4: Update profile with new displayName only (omit phoneNumber)
  const newDisplayName: string & tags.MaxLength<100> = typia.assert<
    string & tags.MaxLength<100>
  >(RandomGenerator.alphaNumeric(50) satisfies string);
  const updateBody = {
    displayName: newDisplayName,
  } satisfies IEcommerceMallCustomerProfile.IUpdate;
  const updatedProfile: IEcommerceMallCustomerProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // Step 5: Validate response
  TestValidator.equals(
    "display name updated to new value",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number preserved from original",
    updatedProfile.phoneNumber,
    originalPhoneNumber,
  );
  TestValidator.notEquals(
    "display name changed from original",
    updatedProfile.displayName,
    originalDisplayName,
  );
}