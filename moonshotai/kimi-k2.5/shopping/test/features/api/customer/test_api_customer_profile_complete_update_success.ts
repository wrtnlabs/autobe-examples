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

export async function test_api_customer_profile_complete_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer via join endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Prepare update data for displayName and phoneNumber
  const updateBody = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } as IEcommerceMallCustomer.IUpdate;
  // 3. Call PUT /ecommerceMall/customer/profile to update profile
  const updatedProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // 4. Verify both fields reflect the submitted changes
  TestValidator.equals(
    "displayName matches",
    (updatedProfile as any).displayName,
    (updateBody as any).displayName,
  );
  TestValidator.equals(
    "phoneNumber matches",
    updatedProfile.phoneNumber,
    (updateBody as any).phoneNumber,
  );
}