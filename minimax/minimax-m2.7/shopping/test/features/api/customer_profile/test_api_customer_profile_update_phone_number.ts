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

export async function test_api_customer_profile_update_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Update phone number with valid data (10-20 characters)
  // Using RandomGenerator.mobile() which generates 10-12 characters like "01012345678"
  const newPhone = RandomGenerator.mobile("010");
  const updatedProfile =
    await api.functional.ecommerceMall.customer.customers.profile.update(
      customerConnection,
      {
        body: {
          phone: newPhone,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Validate the phone field was updated
  TestValidator.equals(
    "phone should be updated",
    updatedProfile.phone,
    newPhone,
  );
  // 4. Validate displayName remains unchanged (null since not set originally)
  TestValidator.equals(
    "displayName should remain null",
    updatedProfile.displayName,
    null,
  );
  // 5. Validate profileType is "customer"
  TestValidator.equals(
    "profileType should be customer",
    updatedProfile.profileType,
    "customer",
  );
  // 6. Validate response has all required fields
  TestValidator.predicate("should have id", updatedProfile.id !== undefined);
  TestValidator.predicate(
    "should have customerId",
    updatedProfile.customerId !== undefined,
  );
}
