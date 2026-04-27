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

export async function test_api_customer_profile_update_partial_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer and capture the initial profile
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Initial profile after registration has empty display_name and phone_number
  const initialProfile = authorized.profile;
  typia.assert(initialProfile);
  // 2. Update only displayName (omit phoneNumber), verify partial update
  const newDisplayName = RandomGenerator.name();
  const updatedProfile1: IECommerceMallCustomerProfile =
    await api.functional.eCommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
        } satisfies IECommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile1);
  TestValidator.equals(
    "display_name updated",
    updatedProfile1.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number preserved",
    updatedProfile1.phone_number,
    initialProfile.phone_number,
  );
  // 3. Clear phone number by setting phoneNumber to null, verify phone_number becomes null
  const updatedProfile2: IECommerceMallCustomerProfile =
    await api.functional.eCommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          phoneNumber: null,
        } satisfies IECommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile2);
  TestValidator.equals(
    "display_name unchanged",
    updatedProfile2.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number cleared",
    updatedProfile2.phone_number,
    null,
  );
}
