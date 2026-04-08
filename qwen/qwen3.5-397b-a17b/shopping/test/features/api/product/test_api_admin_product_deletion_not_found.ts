import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator product deletion with non-existent product ID.
 *
 * Validates that the admin product deletion endpoint properly handles attempts to delete products that do not exist in the system. The test authenticates as an administrator and attempts to delete a product using a valid UUID format that has never been created.
 *
 * This edge case is critical for API robustness as it ensures the system validates resource existence before attempting deletion operations. The endpoint should return 404 Not Found rather than processing the deletion or returning a different error code, preventing potential security issues from resource enumeration attacks.
 *
 * 1. Administrator authenticates via join endpoint to obtain access token.
 * 2. Generate a valid UUID that does not correspond to any existing product.
 * 3. Attempt to delete the non-existent product using admin erase endpoint.
 * 4. Validate that the operation throws an HttpError with 404 status code.
 * 5. Confirm proper error handling for non-existent resource deletion attempts.
 */
export async function test_api_admin_product_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate non-existent product ID
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt deletion and validate 404 error
  await TestValidator.httpError(
    "admin delete non-existent product returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.products.erase(adminConnection, {
        productId: nonExistentProductId,
      });
    },
  );
}
