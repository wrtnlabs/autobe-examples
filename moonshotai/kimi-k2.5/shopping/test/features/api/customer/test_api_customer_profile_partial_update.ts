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

export async function test_api_customer_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to establish baseline profile with empty fields
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Verify initial state - profile should have null displayName and phoneNumber
  TestValidator.equals(
    "initial displayName is null",
    authorized.profile.displayName,
    null,
  );
  TestValidator.equals(
    "initial phoneNumber is null",
    authorized.profile.phoneNumber,
    null,
  );
  // 2. Update only displayName (phoneNumber omitted from request)
  const displayName = RandomGenerator.name();
  const profileWithDisplayName =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(profileWithDisplayName);
  // 3. Verify phoneNumber remains as previously set (null)
  TestValidator.equals(
    "displayName updated",
    profileWithDisplayName.displayName,
    displayName,
  );
  TestValidator.equals(
    "phoneNumber remains null",
    profileWithDisplayName.phoneNumber,
    null,
  );
  // 4. Update only phoneNumber (displayName omitted from request)
  const phoneNumber = RandomGenerator.mobile();
  const profileWithPhoneNumber =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          phoneNumber,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(profileWithPhoneNumber);
  // 5. Verify displayName from step 2 is preserved
  TestValidator.equals(
    "displayName preserved",
    profileWithPhoneNumber.displayName,
    displayName,
  );
  TestValidator.equals(
    "phoneNumber updated",
    profileWithPhoneNumber.phoneNumber,
    phoneNumber,
  );
}
