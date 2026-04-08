import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_relationship_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that variant snapshot history rejects a product and variant pair that do not belong together.
   *
   * This test authenticates a seller and then requests snapshot history using a validly formatted but
   * mismatched productId and variantId combination. The endpoint must respond with a not-found style error,
   * ensuring snapshot history is only accessible through the correct product-variant relationship and not
   * through a cross-product identifier mix-up.
   *
   * 1. Register and authenticate a seller account for an authorized request context.
   * 2. Call the variant snapshot history endpoint with mismatched identifiers.
   * 3. Assert the endpoint rejects the invalid relationship as a not-found style outcome.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot history should reject a mismatched product-variant relationship",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.snapshots.index(
        sellerConnection,
        {
          productId,
          variantId,
          body: {
            page: 1,
            limit: 10,
            sort: "newest",
          } satisfies IMallPlatformProductVariantSnapshot.IRequest,
        },
      );
    },
  );
}
