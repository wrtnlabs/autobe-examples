import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Register a new customer and capture their profile
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  const originalEmail = customerAuth.email;
  // 3. Primary Success Path: Admin updates customer's nickname and phone
  const updateBody = {
    nickname: "UpdatedNickname",
    phone: "010-1234-5678",
  } satisfies IShoppingMallCustomer.IUpdate;
  const updated = await api.functional.shoppingMall.admin.customers.update(
    adminConnection,
    {
      customerId,
      body: updateBody,
    },
  );
  typia.assert(updated);
  // Validate updated fields
  TestValidator.equals("nickname updated", updated.nickname, "UpdatedNickname");
  TestValidator.equals("phone updated", updated.phone, "010-1234-5678");
  // Validate immutable fields unchanged
  TestValidator.equals("email unchanged", updated.email, originalEmail);
  TestValidator.equals("isBanned unchanged", updated.isBanned, false);
  TestValidator.equals("deletedAt is null", updated.deletedAt, null);
  TestValidator.equals("id matches", updated.id, customerId);
  // Validate updatedAt is a valid datetime and >= createdAt
  TestValidator.predicate(
    "updatedAt is not before createdAt",
    new Date(updated.updatedAt) >= new Date(updated.createdAt),
  );
  // 4. Edge Case: Admin clears phone by setting it to null
  const clearPhoneBody = {
    nickname: "AnotherNickname",
    phone: null,
  } satisfies IShoppingMallCustomer.IUpdate;
  const cleared = await api.functional.shoppingMall.admin.customers.update(
    adminConnection,
    {
      customerId,
      body: clearPhoneBody,
    },
  );
  typia.assert(cleared);
  // Validate phone cleared and new nickname applied
  TestValidator.equals("phone cleared to null", cleared.phone, null);
  TestValidator.equals(
    "nickname updated again",
    cleared.nickname,
    "AnotherNickname",
  );
  // Validate immutable fields still unchanged
  TestValidator.equals("email still unchanged", cleared.email, originalEmail);
  TestValidator.equals("isBanned still false", cleared.isBanned, false);
  TestValidator.equals("deletedAt still null", cleared.deletedAt, null);
  TestValidator.equals("id still matches", cleared.id, customerId);
}
