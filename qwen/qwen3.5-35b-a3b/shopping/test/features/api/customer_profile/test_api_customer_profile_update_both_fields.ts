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

export async function test_api_customer_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins platform
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(joined);
  // 2. Store original values
  const oldDisplayName = joined.display_name;
  const oldPhoneNumber = joined.phone_number;
  // 3. Generate new values for update
  const newDisplayName = RandomGenerator.name(3);
  const newPhoneNumber = RandomGenerator.mobile();
  // 4. Update profile with both fields
  const updated = await api.functional.ecommerceMall.customer.profile.update(
    customerConnection,
    {
      body: {
        displayName: newDisplayName,
        phoneNumber: newPhoneNumber,
      } satisfies IEcommerceMallCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate both fields updated
  TestValidator.equals(
    "display name updated correctly",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated correctly",
    updated.phone_number,
    newPhoneNumber,
  );
  // 6. Verify old values changed
  TestValidator.notEquals(
    "display name changed from original",
    oldDisplayName,
    updated.display_name,
  );
  TestValidator.notEquals(
    "phone number changed from original",
    oldPhoneNumber,
    updated.phone_number,
  );
}
