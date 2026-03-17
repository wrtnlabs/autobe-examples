import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_repeated_changes_reflect_latest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new customer and get authorized session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Capture initial immutable fields for later comparison
  const initialId = authorized.customer.id;
  const initialEmail = authorized.customer.email;
  const initialIsBanned = authorized.customer.isBanned;
  const initialCreatedAt = authorized.customer.createdAt;
  const initialDeletedAt = authorized.customer.deletedAt;
  // 2. First update
  const firstUpdate = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        nickname: "FirstUpdate",
        phone: "010-1234-5678",
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Validate first update values
  TestValidator.equals(
    "first update nickname",
    firstUpdate.nickname,
    "FirstUpdate",
  );
  TestValidator.equals(
    "first update phone",
    firstUpdate.phone,
    "010-1234-5678",
  );
  // Validate immutable fields unchanged after first update
  TestValidator.equals(
    "id unchanged after first update",
    firstUpdate.id,
    initialId,
  );
  TestValidator.equals(
    "email unchanged after first update",
    firstUpdate.email,
    initialEmail,
  );
  TestValidator.equals(
    "isBanned unchanged after first update",
    firstUpdate.isBanned,
    initialIsBanned,
  );
  TestValidator.equals(
    "createdAt unchanged after first update",
    firstUpdate.createdAt,
    initialCreatedAt,
  );
  TestValidator.equals(
    "deletedAt unchanged after first update",
    firstUpdate.deletedAt,
    initialDeletedAt,
  );
  // 3. Second update
  const secondUpdate =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          nickname: "SecondUpdate",
          phone: "010-8765-4321",
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Validate second update values
  TestValidator.equals(
    "second update nickname",
    secondUpdate.nickname,
    "SecondUpdate",
  );
  TestValidator.equals(
    "second update phone",
    secondUpdate.phone,
    "010-8765-4321",
  );
  // Validate immutable fields unchanged after second update
  TestValidator.equals(
    "id unchanged after second update",
    secondUpdate.id,
    initialId,
  );
  TestValidator.equals(
    "email unchanged after second update",
    secondUpdate.email,
    initialEmail,
  );
  TestValidator.equals(
    "isBanned unchanged after second update",
    secondUpdate.isBanned,
    initialIsBanned,
  );
  TestValidator.equals(
    "createdAt unchanged after second update",
    secondUpdate.createdAt,
    initialCreatedAt,
  );
  TestValidator.equals(
    "deletedAt unchanged after second update",
    secondUpdate.deletedAt,
    initialDeletedAt,
  );
  // Validate that updatedAt of second update >= updatedAt of first update
  TestValidator.predicate(
    "second updatedAt is >= first updatedAt",
    new Date(secondUpdate.updatedAt).getTime() >=
      new Date(firstUpdate.updatedAt).getTime(),
  );
  // Validate second update nickname is different from first
  TestValidator.notEquals(
    "nickname changed between updates",
    firstUpdate.nickname,
    secondUpdate.nickname,
  );
  TestValidator.notEquals(
    "phone changed between updates",
    firstUpdate.phone,
    secondUpdate.phone,
  );
}
