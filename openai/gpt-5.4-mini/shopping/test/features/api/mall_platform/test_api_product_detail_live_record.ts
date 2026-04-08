import api from "@ORGANIZATION/PROJECT-api";
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
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_live_record(
  connection: api.IConnection,
): Promise<void> {
  const productId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "product detail should reject a missing product id",
    [404],
    async () => {
      await api.functional.mallPlatform.products.at(connection, {
        productId,
      });
    },
  );
  const product = await api.functional.mallPlatform.products.at(connection, {
    productId,
  });
  typia.assert(product);
  TestValidator.equals(
    "product detail should preserve the product id",
    product.id,
    productId,
  );
  TestValidator.predicate(
    "product seller summary should exist",
    product.sellerAccount.id.length > 0 &&
      product.sellerAccount.email.length > 0,
  );
  TestValidator.predicate(
    "product core fields should exist",
    product.name.length > 0 && product.description.length > 0,
  );
  TestValidator.predicate(
    "product base price should be a valid catalog price",
    product.basePrice >= 0,
  );
  TestValidator.predicate(
    "product timestamps should be populated",
    product.createdAt.length > 0 && product.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "product deletedAt should reflect an active live record",
    product.deletedAt === null,
  );
  TestValidator.predicate(
    "product images collection should be live data",
    Array.isArray(product.images),
  );
  TestValidator.predicate(
    "product variants collection should be live data",
    Array.isArray(product.variants),
  );
  TestValidator.predicate(
    "product wishlist references should be live data",
    Array.isArray(product.wishlistItems),
  );
  TestValidator.predicate(
    "product review collection should be live data",
    Array.isArray(product.reviews),
  );
  TestValidator.predicate(
    "product snapshot history should be available as preserved history",
    Array.isArray(product.snapshots),
  );
  TestValidator.predicate(
    "product variant snapshot history should be available as preserved history",
    Array.isArray(product.variantSnapshots),
  );
  TestValidator.predicate(
    "product image snapshot history should be available as preserved history",
    Array.isArray(product.productImageSnapshots),
  );
}
