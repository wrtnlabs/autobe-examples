import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_ownership_protection(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const updateBody = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IMallPlatformCustomerProfile.IUpdate;
  const updated = await api.functional.mallPlatform.customer.profile.update(
    customerConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated profile belongs to authenticated customer",
    updated.mallPlatformCustomerId,
    authorized.id,
  );
  TestValidator.equals(
    "display name updated on own profile",
    updated.displayName,
    updateBody.displayName,
  );
  TestValidator.equals(
    "phone number updated on own profile",
    updated.phoneNumber,
    updateBody.phoneNumber,
  );
  TestValidator.equals(
    "profile is active after update",
    updated.deletedAt,
    null,
  );
}
