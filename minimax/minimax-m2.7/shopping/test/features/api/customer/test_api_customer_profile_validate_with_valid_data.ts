import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerProfileValidateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfileValidateResult";
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

export async function test_api_customer_profile_validate_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account with valid credentials
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
  // 2. Update profile with valid display name and phone number
  const displayName = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const profile =
    await api.functional.ecommerceMall.customer.customers.profile.update(
      customerConnection,
      {
        body: {
          displayName: displayName satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<100>,
          phone: phone satisfies string &
            tags.MinLength<10> &
            tags.MaxLength<20>,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(profile);
  // 3. Call the profile validation endpoint
  const validationResult =
    await api.functional.ecommerceMall.customer.profile.validate.at(
      customerConnection,
    );
  typia.assert(validationResult);
  // 4. Verify validation returns valid: true and empty errors array
  TestValidator.equals(
    "validation should be valid",
    validationResult.valid,
    true,
  );
  TestValidator.equals(
    "errors array should be empty",
    validationResult.errors.length,
    0,
  );
}
