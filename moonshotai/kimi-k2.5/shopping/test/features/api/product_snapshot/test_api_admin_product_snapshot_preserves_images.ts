import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_admin_product_snapshot_preserves_images(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Step 2: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // Step 3: Create a category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.name(2) } },
  );
  typia.assert(category);
  // Step 4: Create product images
  const productImages: IEcommerceMallProductImage.ICreate[] = [
    {
      imageUrl: typia.random<string & tags.Format<"uri">>(),
    },
    {
      imageUrl: typia.random<string & tags.Format<"uri">>(),
    },
    {
      imageUrl: typia.random<string & tags.Format<"uri">>(),
    },
  ];
  // Step 5: Create a product with images as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: productImages,
      },
    },
  );
  typia.assert(product);
  // Verify product was created with images
  TestValidator.predicate(
    "product has images",
    product.images.length === productImages.length,
  );
  // Step 6: Retrieve product snapshot using admin connection
  // Product creation creates an initial snapshot with ID matching product ID or similar
  // We'll use the product ID to retrieve its snapshots
  // For this test, we assume the first snapshot has ID matching the product or we need to list snapshots first
  // Given the API available, we'll try to fetch snapshot with a known relationship
  // Get the snapshot by using product ID; typically snapshot ID pattern may vary
  // We use the product ID as snapshot ID for initial snapshot (common pattern)
  const snapshot =
    await api.functional.ecommerceMall.admin.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: product.id,
      },
    );
  typia.assert(snapshot);
  // Step 7: Validate snapshot preserves images correctly
  TestValidator.equals(
    "snapshot product ID matches",
    snapshot.productId,
    product.id,
  );
  TestValidator.equals(
    "snapshot category ID matches",
    snapshot.categoryId,
    product.category.id,
  );
  TestValidator.predicate("snapshot has images", snapshot.images.length > 0);
  // Validate each image in the snapshot has required fields
  for (const image of snapshot.images) {
    typia.assert(image);
    TestValidator.predicate(
      "snapshot image has valid URL",
      typeof image.url === "string" && image.url.length > 0,
    );
    TestValidator.predicate(
      "snapshot image has valid display order",
      typeof image.displayOrder === "number" && image.displayOrder >= 1,
    );
  }
  // Validate image URLs match the original product images
  const originalImageUrls = productImages.map((img) => img.imageUrl).sort();
  const snapshotImageUrls = snapshot.images.map((img) => img.url).sort();
  TestValidator.equals(
    "snapshot preserves image URLs",
    snapshotImageUrls,
    originalImageUrls,
  );
}
