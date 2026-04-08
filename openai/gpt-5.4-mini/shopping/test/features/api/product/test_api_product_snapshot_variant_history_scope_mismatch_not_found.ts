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

export async function test_api_product_snapshot_variant_history_scope_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that product snapshot variant history cannot be read across mismatched product scope.
   *
   * This scenario validates that the historical variant listing endpoint rejects requests when the snapshot does not belong to the product identified in the path. The test creates two products under the same seller and then attempts to read variant history using the first product id with a snapshot identifier that is not guaranteed to belong to it.
   *
   * The expected behavior is a not found response rather than any cross-product historical data being returned. This protects immutable historical records from being disclosed outside their owning product scope.
   *
   * 1. Register a seller account and create an authenticated seller connection.
   * 2. Create two products owned by the seller.
   * 3. Attempt to read variant history using the first product id and a non-matching snapshot id.
   * 4. Verify the endpoint rejects the mismatched scope with a not found error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const firstProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(firstProduct);
  const secondProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(secondProduct);
  const mismatchedSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched product snapshot variant history should not be found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.snapshots.variants.getByProductidAndSnapshotid(
        sellerConnection,
        {
          productId: firstProduct.id,
          snapshotId: mismatchedSnapshotId,
        },
      );
    },
  );
}
