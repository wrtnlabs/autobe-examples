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

export async function test_api_product_image_retrieve_by_parent_product(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve a product image through its parent product scope as an administrator.
   *
   * Verifies that the administrator-only image retrieval endpoint returns the
   * current product image entity for a valid parent product and image identifier
   * pair. The test authenticates an administrator, retrieves the image using the
   * scoped route, and validates that the response preserves the current gallery
   * ordering and owning product summary.
   *
   * This scenario focuses on the current persisted image record rather than any
   * snapshot or historical state. It ensures the returned image belongs to the
   * requested product and exposes the expected presentation fields used by the
   * product gallery and detail pages.
   *
   * 1. Register and authenticate an administrator account.
   * 2. Retrieve a product image by productId and imageId through the administrator scope.
   * 3. Validate the returned image entity and its owning product summary.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234" satisfies string & tags.Format<"password">,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.products.images.at(
      administratorConnection,
      {
        productId,
        imageId,
      },
    );
  typia.assert(output);
  TestValidator.equals("product image id", output.id, imageId);
  TestValidator.equals(
    "product image owning product id",
    output.product.id,
    productId,
  );
  TestValidator.predicate("image url is present", output.imageUrl.length > 0);
  TestValidator.predicate(
    "sort order is integer",
    Number.isInteger(output.sortOrder),
  );
  TestValidator.predicate("createdAt is present", output.createdAt.length > 0);
  TestValidator.predicate("updatedAt is present", output.updatedAt.length > 0);
  TestValidator.equals(
    "deletedAt is null for active image",
    output.deletedAt,
    null,
  );
}
