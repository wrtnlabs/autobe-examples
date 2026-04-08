import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
 * Test that an administrator receives 404 error when attempting to retrieve a product with a non-existent UUID.
 *
 * Validates the product retrieval endpoint's error handling for non-existent products. An administrator with valid authentication should receive a 404 Not Found response when attempting to access a product that does not exist in the system. This test ensures proper error handling and that no sensitive information is leaked when a product is not found.
 *
 * 1. Administrator authenticates via admin join to obtain valid authorization.
 * 2. Generate a random UUID that does not exist in the system.
 * 3. Call GET /admin/admin/products/{productId} with the non-existent UUID.
 * 4. Validate that response returns 404 Not Found status.
 * 5. Confirm appropriate error message is included in the response.
 */
export async function test_api_product_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent product
  // 4. & 5. Validate that 404 error is returned
  await TestValidator.httpError(
    "product not found returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.products.at(
        adminConnection,
        {
          productId: nonExistentProductId,
        },
      ),
  );
}
