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

/**
 * Verify seller-scoped variant retrieval returns not-found for missing product or variant resources.
 *
 * This test authenticates a seller, then checks the scoped product-variant lookup against
 * three invalid cases: a missing parent product, a missing variant within an existing product,
 * and a mismatched product/variant pair. The endpoint must respond with not-found without
 * disclosing which identifier was invalid.
 *
 * 1. Authenticate as a seller using an isolated connection.
 * 2. Request a variant using a missing product identifier.
 * 3. Request a variant using a missing variant identifier under a valid-looking product identifier.
 * 4. Request a variant using mismatched product and variant identifiers.
 */
export async function test_api_product_variant_retrieve_missing_resource(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const missingProductId = typia.random<string & tags.Format<"uuid">>();
  const missingVariantId = typia.random<string & tags.Format<"uuid">>();
  const anotherMissingProductId = typia.random<string & tags.Format<"uuid">>();
  const anotherMissingVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing parent product should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variants.at(
        sellerConnection,
        {
          productId: missingProductId,
          variantId: missingVariantId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing variant should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variants.at(
        sellerConnection,
        {
          productId: anotherMissingProductId,
          variantId: anotherMissingVariantId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "mismatched product and variant should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variants.at(
        sellerConnection,
        {
          productId: missingProductId,
          variantId: anotherMissingVariantId,
        },
      );
    },
  );
}
