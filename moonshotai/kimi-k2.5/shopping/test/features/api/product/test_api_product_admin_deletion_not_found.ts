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
 * Test deletion of a non-existent product by admin.
 *
 * 1. Authenticate as admin
 * 2. Generate a random UUID that doesn't exist in the database
 * 3. Attempt to delete the non-existent product
 * 4. Verify that a 404 Not Found error is returned
 */
export async function test_api_product_admin_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate a random UUID that doesn't exist in the database
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent product and expect 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.products.erase(adminConnection, {
        productId: nonExistentProductId,
      });
    },
  );
}
