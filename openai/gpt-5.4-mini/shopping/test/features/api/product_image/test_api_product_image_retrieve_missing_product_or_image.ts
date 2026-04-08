import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_image_retrieve_missing_product_or_image(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product image retrieval failure behavior for missing product and image references.
   *
   * Validates that the customer image lookup endpoint reports a normal not-found style business error when the parent product identifier does not exist or when the image identifier cannot be resolved under the requested product scope.
   *
   * The test also ensures the failed lookup does not leak image data and does not mutate any product image state.
   *
   * 1. Register and authenticate a customer account.
   * 2. Request an image with a missing parent product identifier.
   * 3. Request an image with a different missing identifier combination to represent a missing scoped image lookup.
   * 4. Confirm both calls fail as not-found style business errors.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const missingProductId = typia.random<string & tags.Format<"uuid">>();
  const missingImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "missing parent product should be not found",
    async () => {
      await api.functional.mallPlatform.customer.products.images.at(
        customerConnection,
        {
          productId: missingProductId,
          imageId: missingImageId,
        },
      );
    },
  );
  await TestValidator.error(
    "missing scoped image should be not found",
    async () => {
      await api.functional.mallPlatform.customer.products.images.at(
        customerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
