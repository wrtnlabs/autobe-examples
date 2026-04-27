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

export async function test_api_customer_profile_update_full(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Register customer and capture initial profile
  //----
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  const initialProfile = authorized.profile;
  //----
  // 2. Update profile with new display name and phone number
  //----
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.eCommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
          phoneNumber: newPhoneNumber,
        } satisfies IECommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  //----
  // 3. Validate changes
  //----
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  TestValidator.predicate(
    "updated_at changed after profile update",
    updatedProfile.updated_at !== initialProfile.updated_at,
  );
}
