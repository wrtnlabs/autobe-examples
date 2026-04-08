import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator receives an HTTP 404 error when attempting to delete a product that does not exist.
 *
 * This test validates the administrative product deletion endpoint's behavior when given a non-existent product identifier. It ensures that the system properly handles requests for resources that cannot be found, returning the appropriate HTTP 404 status code instead of causing server errors or unexpected behavior.
 *
 * **Setup Steps**:
 * 1. Register an admin account via POST /ecommerceMall/auth/admin/join
 * 2. Generate a random UUID that does not correspond to any existing product
 *
 * **Test Execution**:
 * 1. Authenticate as admin using the utility function
 * 2. Call DELETE /ecommerceMall/admin/admin/products/{nonExistentProductId} with a random UUID
 * 3. Expect HTTP 404 Not Found error
 *
 * **Expected Results**:
 * - HTTP 404 Not Found response
 * - Error message indicates product not found
 * - No database changes occur
 */
export async function test_api_product_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a non-existent product UUID
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent product and expect 404 error
  await TestValidator.httpError(
    "delete non-existent product returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.products.erase(
        adminConnection,
        {
          productId: nonExistentProductId,
        },
      ),
  );
}
