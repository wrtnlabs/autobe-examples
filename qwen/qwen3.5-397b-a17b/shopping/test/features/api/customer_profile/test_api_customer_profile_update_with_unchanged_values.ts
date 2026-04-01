import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_with_unchanged_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // 2. Extract current profile information
  const originalProfile = authResult.profile;
  const originalDisplayName = originalProfile.display_name;
  const originalPhoneNumber = originalProfile.phone_number;
  const originalUpdatedAt = originalProfile.updated_at;
  // 3. Update profile with the exact same values
  const updateBody = {
    display_name: originalDisplayName,
    phone_number: originalPhoneNumber,
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate profile data remains unchanged
  TestValidator.equals(
    "display_name unchanged",
    updatedProfile.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "phone_number unchanged",
    updatedProfile.phone_number,
    originalPhoneNumber,
  );
  // 5. Validate updated_at timestamp has changed (proving update executed)
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 6. Validate profile ID remains the same
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    originalProfile.id,
  );
}
