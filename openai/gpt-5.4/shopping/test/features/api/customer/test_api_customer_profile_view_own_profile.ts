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

export async function test_api_customer_profile_view_own_profile(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body,
    });
  typia.assert(authorized);
  const profile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile belongs to authenticated customer id",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile belongs to authenticated customer email",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer deleted_at matches authorized customer",
    profile.customer.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.equals(
    "customer banned_at matches authorized customer",
    profile.customer.banned_at,
    authorized.banned_at,
  );
  TestValidator.predicate(
    "display name is present",
    profile.displayName.trim().length > 0,
  );
  TestValidator.predicate(
    "phone number is present",
    profile.phoneNumber.trim().length > 0,
  );
  TestValidator.equals("profile is active", profile.deletedAt, null);
}
