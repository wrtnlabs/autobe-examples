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

export async function test_api_customer_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: (typia.random<string>() as string) satisfies string & tags.MinLength<1> & tags.Format<"email"> as string & tags.MinLength<1> & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile("010"),
  } satisfies IEcommerceMallCustomer.IJoin;
  const authResult = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(authResult);
  // 2. Prepare update data
  const updateInput = {
    display_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile("011"),
  } satisfies IEcommerceMallCustomerProfile.IUpdate;
  // 3. Update customer profile
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: updateInput,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate update results
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    updateInput.display_name,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    updateInput.phone_number,
  );
  TestValidator.equals(
    "customer ID preserved",
    updatedProfile.user_id,
    authResult.customer.id,
  );
  // 5. Verify profile details
  TestValidator.predicate(
    "created_at exists",
    typeof updatedProfile.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof updatedProfile.updated_at === "string",
  );
}