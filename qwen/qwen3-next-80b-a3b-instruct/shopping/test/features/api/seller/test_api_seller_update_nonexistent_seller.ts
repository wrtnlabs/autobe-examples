import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_update_nonexistent_seller(
  connection: api.IConnection,
) {
  // Authenticate as admin to perform the update operation
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123456",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Generate a random UUID for a non-existent seller
  const nonexistentSellerId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to update the non-existent seller with valid data
  await TestValidator.error(
    "updating non-existent seller should return 404 Not Found",
    async () => {
      await api.functional.shoppingMall.admin.actors.sellers.update(
        connection,
        {
          sellerId: nonexistentSellerId,
          body: {
            business_name: RandomGenerator.paragraph(),
            business_address: RandomGenerator.paragraph(),
            tax_id: typia.random<string>(),
          } satisfies IShoppingMallSeller.IUpdate,
        },
      );
    },
  );
}
