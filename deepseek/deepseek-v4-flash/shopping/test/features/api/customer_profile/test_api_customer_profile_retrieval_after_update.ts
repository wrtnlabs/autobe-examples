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

export async function test_api_customer_profile_retrieval_after_update(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register a new customer account
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Update the customer's display name and phone number
  const updatedProfile =
    await api.functional.eCommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: "Jane Smith",
          phoneNumber: "+82-10-1234-5678",
        } satisfies IECommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Retrieve the customer's profile after update
  const retrievedProfile =
    await api.functional.eCommerceMall.customer.profile.at(customerConnection);
  typia.assert(retrievedProfile);
  // 4. Validate the retrieved profile reflects the updated values
  TestValidator.equals(
    "display name updated",
    retrievedProfile.display_name,
    "Jane Smith",
  );
  TestValidator.equals(
    "phone number updated",
    retrievedProfile.phone_number,
    "+82-10-1234-5678",
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(retrievedProfile.updated_at).getTime() >
      new Date(retrievedProfile.created_at).getTime(),
  );
}
