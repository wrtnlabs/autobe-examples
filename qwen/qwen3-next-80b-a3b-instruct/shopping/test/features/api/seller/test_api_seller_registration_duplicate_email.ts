import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
) {
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Create the first seller with the duplicate email
  const firstSeller = await api.functional.shoppingMall.actors.sellers.create(
    connection,
    {
      body: duplicateEmail satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(firstSeller);

  // Attempt to create second seller with same email - should fail with 409 error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.shoppingMall.actors.sellers.create(connection, {
        body: duplicateEmail satisfies IShoppingMallSeller.ICreate,
      });
    },
  );
}
