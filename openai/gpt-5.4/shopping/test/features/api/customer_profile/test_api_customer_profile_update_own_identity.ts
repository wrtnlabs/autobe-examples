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

export async function test_api_customer_profile_update_own_identity(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const body = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const profile = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body,
    },
  );
  typia.assert(profile);
  TestValidator.predicate("profile id exists", profile.id.length > 0);
  TestValidator.equals(
    "display name is updated",
    profile.displayName,
    body.displayName,
  );
  TestValidator.equals(
    "phone number is updated",
    profile.phoneNumber,
    body.phoneNumber,
  );
  TestValidator.equals(
    "customer identity is preserved",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email is preserved",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer banned state is preserved",
    profile.customer.banned_at,
    authorized.banned_at,
  );
  TestValidator.equals(
    "customer created timestamp is preserved",
    profile.customer.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "customer updated timestamp is preserved",
    profile.customer.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "customer deleted state is preserved",
    profile.customer.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.equals("profile remains active", profile.deletedAt, null);
  TestValidator.predicate(
    "profile updatedAt is not earlier than createdAt",
    new Date(profile.updatedAt).getTime() >=
      new Date(profile.createdAt).getTime(),
  );
}
