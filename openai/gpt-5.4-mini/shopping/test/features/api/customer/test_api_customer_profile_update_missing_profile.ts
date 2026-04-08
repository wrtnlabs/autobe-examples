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

export async function test_api_customer_profile_update_missing_profile(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(registered);
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: registered.token.access,
    },
  };
  await TestValidator.httpError(
    "customer profile update should fail when the profile record is missing",
    [404, 410],
    async () => {
      await api.functional.mallPlatform.customer.profile.update(
        authenticatedConnection,
        {
          body: {
            displayName: RandomGenerator.name(),
            phoneNumber: RandomGenerator.mobile(),
          } satisfies IMallPlatformCustomerProfile.IUpdate,
        },
      );
    },
  );
}
