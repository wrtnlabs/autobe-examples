import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator product image lookup rejects an image that is not attached to the requested product.
 *
 * This test validates the parent-child relationship rule for administrator product image access. It ensures that the API returns a normal not-found business error when the provided image identifier exists as a UUID value but is not associated with the given product identifier.
 *
 * 1. Register an administrator account and obtain an authenticated administrator connection.
 * 2. Call the product image lookup endpoint with a valid product UUID and a different valid image UUID.
 * 3. Assert that the request fails with a not-found style business error.
 */
export async function test_api_product_image_not_found_for_missing_child_image(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator product image lookup should fail with not-found when image is not a child of the specified product",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.images.at(
        adminConnection,
        {
          productId,
          imageId,
        },
      );
    },
  );
}
