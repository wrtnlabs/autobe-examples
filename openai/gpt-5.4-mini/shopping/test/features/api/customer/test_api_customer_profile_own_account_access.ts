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

export async function test_api_customer_profile_own_account_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password1234!";
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const profile =
    await api.functional.mallPlatform.customer.profile.at(customerConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile owner id should match signed-in customer",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile owner email should match signed-in customer",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile owner status should match signed-in customer",
    profile.customer.status,
    authorized.status,
  );
  TestValidator.equals(
    "profile owner should represent the authenticated account",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile should be scoped to the current session owner",
    profile.customer.email,
    email,
  );
}
