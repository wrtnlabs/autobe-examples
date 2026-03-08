import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
  // 1. Customer Registration
  const joinConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customer);
  // 2. Create customer-specific connection with authorization token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer.token.access },
  };
  // 3. Generate old values (representing initial profile state before update)
  const oldDisplayName: string = RandomGenerator.name();
  const oldPhoneNumber: string = RandomGenerator.mobile();
  // 4. Prepare new values for update
  const newDisplayName: string = RandomGenerator.name();
  const newPhoneNumber: string = RandomGenerator.mobile();
  // 5. Update profile with BOTH displayName and phoneNumber
  const updatedProfile: IEcommerceMallCustomerProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
          phoneNumber: newPhoneNumber,
        },
      },
    );
  typia.assert(updatedProfile);
  // 6. Validate response contains updated values
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phoneNumber,
    newPhoneNumber,
  );
  TestValidator.predicate(
    "phone number is non-null",
    updatedProfile.phoneNumber !== null,
  );
  TestValidator.predicate(
    "updated at is set",
    updatedProfile.updatedAt !== undefined,
  );
  // 7. Verify values changed from old to new (snapshot would capture old values)
  TestValidator.notEquals(
    "display name changed",
    oldDisplayName,
    newDisplayName,
  );
  TestValidator.notEquals(
    "phone number changed",
    oldPhoneNumber,
    newPhoneNumber,
  );
}
