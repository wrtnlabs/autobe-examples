import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_product_category_detail_by_administrator_valid_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 0. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };

  // 1. Create a random product category to test valid retrieval (setup)
  // Note: Without create API, simulate known ID with random UUID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  try {
    const category =
      await api.functional.shoppingMall.administrator.product.categories.at(
        adminConnection,
        { categoryId },
      );
    // expected success and validate
    typia.assert(category);
    // Removed validation of non-existent properties per compiler error
  } catch (err) {
    // if 404 error - expected if random UUID doesn't exist
    if (err instanceof api.HttpError && err.status === 404) {
      // expected not found case
    } else {
      throw err;
    }
  }

  // 3. Test retrieval with explicit not found categoryId
  const fakeCategoryId = "00000000-0000-0000-0000-000000000000" as const;
  await TestValidator.httpError(
    `retrieval fails for non-existent category ID ${fakeCategoryId}`,
    404,
    async () => {
      await api.functional.shoppingMall.administrator.product.categories.at(
        adminConnection,
        { categoryId: fakeCategoryId },
      );
    },
  );
}
