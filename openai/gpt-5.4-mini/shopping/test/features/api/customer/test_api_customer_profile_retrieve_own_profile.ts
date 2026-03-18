import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_retrieve_own_profile(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com",
      referrer: "https://example.com/signup",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const profile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  TestValidator.equals("profile id", profile.id, joined.profile?.id);
  TestValidator.equals("profile owner id", profile.customer.id, joined.id);
  TestValidator.equals(
    "profile owner email",
    profile.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "profile owner account status",
    profile.customer.accountStatus,
    joined.accountStatus,
  );
  TestValidator.predicate(
    "profile display name is present",
    profile.displayName.length > 0,
  );
  TestValidator.predicate(
    "profile phone number is present",
    profile.phoneNumber.length > 0,
  );
  TestValidator.equals("profile deletedAt is null", profile.deletedAt, null);
  TestValidator.equals(
    "customer summary deletedAt is null",
    profile.customer.deletedAt,
    null,
  );
  TestValidator.equals(
    "customer summary bannedAt is null",
    profile.customer.bannedAt,
    null,
  );
}
