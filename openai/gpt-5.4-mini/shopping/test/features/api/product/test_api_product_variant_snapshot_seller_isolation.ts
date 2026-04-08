import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

/**
 * Verifies that variant snapshot history is isolated per seller account.
 *
 * This test creates a product and variant under seller A, then attempts to
 * access that seller-owned variant snapshot using seller B's authenticated
 * connection. The scenario validates that ownership boundaries are enforced
 * even when the caller knows the exact product, variant, and snapshot
 * identifiers.
 *
 * 1. Seller A registers and creates a product and variant.
 * 2. Seller A creates the variant snapshot through a legitimate variant change path.
 * 3. Seller B registers as a separate seller account.
 * 4. Seller B attempts to read seller A's variant snapshot and is denied.
 */
export async function test_api_product_variant_snapshot_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAAuthorized);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: "Color: Red / Size: M",
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerBAuthorized);
  await TestValidator.httpError(
    "seller B cannot access seller A variant snapshot",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          snapshotId: variant.id,
        },
      );
    },
  );
}
