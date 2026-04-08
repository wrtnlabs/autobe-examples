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

export async function test_api_customer_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(authorized);
  // Store original profile data
  const originalProfile = authorized.profile;
  const originalProfileId = originalProfile.id;
  const originalCreatedAt = originalProfile.createdAt;
  // 2. Generate new values for displayName and phone
  const newDisplayName = RandomGenerator.name(2);
  const newPhone = RandomGenerator.mobile();
  // 3. Send PATCH request to update both fields
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
          phone: newPhone,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify profile type remains "customer"
  TestValidator.equals(
    "profileType is customer",
    updatedProfile.profileType,
    "customer",
  );
  // 5. Verify profileId (id) remains the same
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    originalProfileId,
  );
  // 6. Verify customerId is preserved
  TestValidator.equals(
    "customerId preserved",
    updatedProfile.customerId,
    authorized.id,
  );
  // 7. Verify createdAt remains unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedProfile.createdAt,
    originalCreatedAt,
  );
  // 8. Verify updatedAt is updated (should be newer than original)
  TestValidator.predicate("updatedAt is current", () => {
    const updatedTime = new Date(updatedProfile.updatedAt).getTime();
    const originalTime = new Date(originalCreatedAt).getTime();
    return updatedTime >= originalTime;
  });
  // 9. Verify displayName is updated
  TestValidator.equals(
    "displayName updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 10. Verify phone is updated
  TestValidator.equals("phone updated", updatedProfile.phone, newPhone);
}