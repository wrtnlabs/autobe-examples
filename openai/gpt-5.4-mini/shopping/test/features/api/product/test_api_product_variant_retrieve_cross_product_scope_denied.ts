import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_retrieve_cross_product_scope_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that product-scoped variant retrieval rejects cross-product access.
   *
   * This test validates the read-only lookup behavior for the seller product
   * variant endpoint by calling it with a mismatched product and variant UUID
   * pair. The expected outcome is a not-found response, which confirms that the
   * backend does not leak variant data across product boundaries.
   *
   * 1. Use a seller-scoped connection created from the base host.
   * 2. Generate unrelated product and variant identifiers.
   * 3. Request the variant using the mismatched identifiers.
   * 4. Assert that the endpoint rejects the lookup with HTTP 404.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `${RandomGenerator.alphabets(12)}!1` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-product variant lookup should be not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variants.at(
        sellerConnection,
        {
          productId,
          variantId,
        },
      );
    },
  );
}
