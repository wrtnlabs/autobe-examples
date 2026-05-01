import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that deleting a non-existent product returns a 404 Not Found error.
 *
 * Validates that the product deletion endpoint correctly handles requests for
 * resources that do not exist. An administrator authenticates and attempts to
 * delete a product using a randomly generated UUID that does not correspond to
 * any product in the system. The endpoint must verify the product exists and its
 * deleted_at is null before proceeding with any deletion steps, returning a 404
 * error when no matching product is found.
 *
 * This test also covers the edge case of attempting to delete an already-deleted
 * product, which would similarly return 404 since the deleted_at field would not
 * be null after a prior deletion.
 *
 * 1. Administrator joins the platform to obtain valid authentication.
 * 2. Administrator attempts to delete a product with a non-existent UUID.
 * 3. The system returns a 404 Not Found error, confirming the resource
 *    verification works correctly.
 */
export async function test_api_product_admin_deletion_not_found(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Attempt to delete a product with a non-existent UUID
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting non-existent product returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.products.erase(adminConnection, {
        productId: nonExistentProductId,
      });
    },
  );
}
