import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_phone_number_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Explicitly clear phoneNumber to null (without changing display_name)
  const updatedProfile =
    await api.functional.eCommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          phoneNumber: null,
        } satisfies IECommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Retrieve profile to verify persistence
  const profile =
    await api.functional.eCommerceMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  // 4. Validate phone_number is null (explicitly cleared)
  TestValidator.predicate(
    "phone number is null after clear",
    profile.phone_number === null,
  );
  // 5. Validate display_name remains as default empty string (unchanged)
  TestValidator.equals(
    "display name unchanged as empty string",
    profile.display_name,
    "",
  );
}
