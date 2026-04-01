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

export async function test_api_customer_profile_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
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
  // 2. Update customer profile with new values
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
          phone_number: newPhoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Retrieve profile to verify changes persisted
  const retrievedProfile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(retrievedProfile);
  // 4. Validate profile updates are reflected
  TestValidator.equals(
    "display name matches update",
    retrievedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number matches update",
    retrievedProfile.phone_number,
    newPhoneNumber,
  );
  // Validate timestamps
  const createdAt = new Date(retrievedProfile.created_at).getTime();
  const updatedAt = new Date(retrievedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    updatedAt >= createdAt,
  );
  // Validate profile relation data is consistent
  TestValidator.equals(
    "customer id matches",
    retrievedProfile.customer.id,
    authResult.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedProfile.customer.email,
    authResult.email,
  );
}
