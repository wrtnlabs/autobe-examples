import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

/**
 * Verifies that product snapshot variant history is scoped to the correct product.
 *
 * This test creates a seller-owned product and then attempts to read preserved
 * variant history using a snapshot identifier that does not belong to that
 * product. The endpoint must reject the mismatched scope so snapshot history
 * cannot leak across products.
 *
 * 1. Register a seller and create a product owned by that seller.
 * 2. Call the product snapshot variants endpoint with the product id and an
 *    unrelated snapshot id.
 * 3. Confirm the request fails with a not-found response.
 */
export async function test_api_product_snapshot_variant_history_wrong_product_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  await TestValidator.httpError(
    "should reject snapshot variants lookup for a snapshot that does not belong to the product",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.snapshots.variants.index(
        sellerConnection,
        {
          productId: product.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductSnapshotVariant.IRequest,
        },
      );
    },
  );
}
