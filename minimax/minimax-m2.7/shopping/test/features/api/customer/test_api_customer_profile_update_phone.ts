import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_phone(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // Store original profile data for comparison
  const originalDisplayName = authorized.profile.displayName;
  const originalProfileId = authorized.profile.id;
  const originalUpdatedAt = authorized.profile.updatedAt;
  // 2. Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 3. Generate a new phone number
  const newPhone = RandomGenerator.mobile();
  // 4. Update profile with only phone field
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          phone: newPhone,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate the response
  // phone should be updated to the new phone number
  TestValidator.equals("phone updated", updatedProfile.phone, newPhone);
  // displayName should remain unchanged
  TestValidator.equals(
    "displayName unchanged",
    updatedProfile.displayName,
    originalDisplayName,
  );
  // profileType should remain "customer"
  TestValidator.equals(
    "profileType is customer",
    updatedProfile.profileType,
    "customer",
  );
  // id should remain the same
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    originalProfileId,
  );
  // customerId should remain the same
  TestValidator.equals(
    "customerId unchanged",
    updatedProfile.customerId,
    authorized.id,
  );
  // updatedAt should be updated (greater than original)
  const originalTime = new Date(originalUpdatedAt).getTime();
  const updatedTime = new Date(updatedProfile.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt timestamp changed",
    updatedTime > originalTime,
  );
}
