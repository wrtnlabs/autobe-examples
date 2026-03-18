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

export async function test_api_customer_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12) + "1!A",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: joined.token.access,
  };
  const originalProfile = joined.profile;
  TestValidator.predicate(
    "customer profile should exist after registration",
    originalProfile !== null,
  );
  if (originalProfile === null) return;
  const body = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const updated = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    { body },
  );
  typia.assert(updated);
  TestValidator.equals(
    "profile id should remain unchanged",
    updated.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "customer id should remain unchanged",
    updated.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email should remain unchanged",
    updated.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "customer account status should remain unchanged",
    updated.customer.accountStatus,
    joined.accountStatus,
  );
  TestValidator.equals(
    "customer banned timestamp should remain unchanged",
    updated.customer.bannedAt,
    joined.bannedAt,
  );
  TestValidator.equals(
    "customer deleted timestamp should remain unchanged",
    updated.customer.deletedAt,
    joined.deletedAt,
  );
  TestValidator.equals(
    "updated display name should match request",
    updated.displayName,
    body.displayName,
  );
  TestValidator.equals(
    "updated phone number should match request",
    updated.phoneNumber,
    body.phoneNumber,
  );
  TestValidator.notEquals(
    "profile display name should change",
    originalProfile.displayName,
    updated.displayName,
  );
  TestValidator.notEquals(
    "profile phone number should change",
    originalProfile.phoneNumber,
    updated.phoneNumber,
  );
}
