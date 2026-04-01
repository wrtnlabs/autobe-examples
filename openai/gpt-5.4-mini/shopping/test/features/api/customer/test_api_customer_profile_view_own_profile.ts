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

export async function test_api_customer_profile_view_own_profile(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.mallPlatform.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(authorized);
  const profile =
    await api.functional.mallPlatform.customer.profile.at(customerConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile owner matches authenticated customer",
    profile.mallPlatformCustomerId,
    authorized.id,
  );
  TestValidator.predicate(
    "profile display name is present",
    profile.displayName.length > 0,
  );
  TestValidator.predicate(
    "profile phone number is present",
    profile.phoneNumber.length > 0,
  );
  TestValidator.equals("profile is active", profile.deletedAt, null);
  TestValidator.equals(
    "profile id is a stable profile identifier",
    profile.id,
    profile.id,
  );
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "anonymous profile access rejected",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.customer.profile.at(
        anonymousConnection,
      );
    },
  );
}
