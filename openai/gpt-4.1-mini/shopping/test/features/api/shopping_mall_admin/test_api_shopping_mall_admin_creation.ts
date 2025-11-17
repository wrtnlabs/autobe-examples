import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_shopping_mall_admin_creation(
  connection: api.IConnection,
) {
  // 1. Join to create initial authorized admin user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://test.example.com/admin/join",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallAdmin.IJoin;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorizedAdmin);

  // 2. Use the authorized connection to create a new shopping mall admin
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdAdmin);
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    createBody.email,
  );

  // 3. Attempt to create another admin with the same email to test uniqueness validation
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      { body: createBody },
    );
  });
}
