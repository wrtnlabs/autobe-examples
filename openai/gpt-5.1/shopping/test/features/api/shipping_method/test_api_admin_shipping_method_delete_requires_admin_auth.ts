import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_admin_shipping_method_delete_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an admin-authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a shipping method to be the deletion target
  const createBody = {
    method_code: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    service_level_description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const createdMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert(createdMethod);

  TestValidator.equals(
    "created method_code matches request",
    createdMethod.method_code,
    createBody.method_code,
  );

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to delete with unauthenticated connection and expect an error
  await TestValidator.error(
    "unauthenticated delete must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.shippingMethods.erase(
        unauthenticatedConnection,
        {
          methodCode: createdMethod.method_code,
        },
      );
    },
  );

  // 5. Verify the method still exists by successfully deleting it as admin
  //    If the previous unauthorized call had succeeded, this call would typically
  //    fail with a not-found style error. A successful call here implies the
  //    method was still present after the unauthenticated attempt.
  await api.functional.shoppingMall.admin.shippingMethods.erase(connection, {
    methodCode: createdMethod.method_code,
  });
}
