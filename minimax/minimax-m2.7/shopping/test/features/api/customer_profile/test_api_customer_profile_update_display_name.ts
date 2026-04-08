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

export async function test_api_customer_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Store original profile data
  const originalProfile = authorized.profile;
  const originalDisplayName = originalProfile.displayName;
  const originalPhone = originalProfile.phone;
  const originalCreatedAt = originalProfile.createdAt;
  const profileId = originalProfile.id;
  // 2. Generate new display name
  const newDisplayName = RandomGenerator.name();
  // 3. Update profile with only displayName field
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify displayName was updated to new value
  TestValidator.equals(
    "displayName updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 5. Verify phone field remains unchanged
  TestValidator.equals("phone unchanged", updatedProfile.phone, originalPhone);
  // 6. Verify updatedAt timestamp is more recent than original
  TestValidator.predicate(
    "updatedAt is current",
    new Date(updatedProfile.updatedAt).getTime() >=
      new Date(originalProfile.updatedAt).getTime(),
  );
  // 7. Verify other profile fields remain correct
  TestValidator.equals("profile id preserved", updatedProfile.id, profileId);
  TestValidator.equals(
    "profileType is customer",
    updatedProfile.profileType,
    "customer",
  );
  TestValidator.equals(
    "customerId preserved",
    updatedProfile.customerId,
    authorized.id,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedProfile.createdAt,
    originalCreatedAt,
  );
}
