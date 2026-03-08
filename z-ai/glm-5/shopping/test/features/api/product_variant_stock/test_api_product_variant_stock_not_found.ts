import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductVariantStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantStock";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that the system returns 404 error when an administrator
 * requests stock for a non-existent variant.
 *
 * This test validates the business rule that requesting stock
 * information for a variant that doesn't exist (or has been
 * soft-deleted) returns a 404 Not Found error.
 */
export async function test_api_product_variant_stock_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Generate a non-existent variant UUID
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  // Test & Validate: Verify 404 error for non-existent variant
  await TestValidator.httpError("non-existent variant stock", 404, async () => {
    await api.functional.shoppingMall.administrator.variants.stock.at(
      adminConnection,
      { variantId: nonExistentVariantId },
    );
  });
}
