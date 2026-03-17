import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_snapshot_with_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(seller);
  // Step 2: Create admin connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 3: Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(category);
  // Step 4: Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Step 5: Create variant as seller
  const originalSkuCode = RandomGenerator.alphaNumeric(10);
  const originalPrice = typia.random<
    number & tags.Minimum<1> & tags.Maximum<500>
  >();
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: originalSkuCode,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: originalPrice,
          stock: 100 as number,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Store original values for later validation
  const originalOptionValues: IEcommerceMallProductVariantOption.ICreate[] = [
    { optionName: "Color", optionValue: "Red" },
    { optionName: "Size", optionValue: "Large" },
  ];
  // Step 6: Edit the variant to trigger snapshot creation
  const updatedSkuCode = RandomGenerator.alphaNumeric(10);
  const updatedPrice = originalPrice + 50;
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: updatedSkuCode,
          price: updatedPrice,
          optionValues: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Small" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Step 7: Query snapshots
  const snapshots =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1> as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
          limit: 20 satisfies number & tags.Type<"int32"> & tags.Default<20> & tags.Minimum<1> & tags.Maximum<100> as number & tags.Type<"int32"> & tags.Default<20> & tags.Minimum<1> & tags.Maximum<100>,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validations
  // 1. Response contains at least 1 snapshot
  TestValidator.predicate(
    "snapshots data array has at least 1 item",
    snapshots.data.length >= 1,
  );
  // 2. The snapshot shows the variant state BEFORE step 6 (original values)
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  // 3. Snapshot includes timestamp, skuCode, price, and optionValues
  TestValidator.predicate(
    "snapshot has createdAt timestamp",
    firstSnapshot.createdAt !== null,
  );
  TestValidator.equals(
    "snapshot skuCode matches original",
    firstSnapshot.skuCode,
    originalSkuCode,
  );
  TestValidator.equals(
    "snapshot price matches original",
    firstSnapshot.price,
    originalPrice,
  );
  TestValidator.predicate(
    "snapshot has optionValues",
    Object.keys(firstSnapshot.optionValues).length > 0,
  );
  // 4. Snapshots are ordered by createdAt descending (newest first) - verify first snapshot contains original values
  const optionValuesMatch =
    firstSnapshot.optionValues["Color"] === "Red" &&
    firstSnapshot.optionValues["Size"] === "Large";
  TestValidator.predicate(
    "first snapshot contains original option values (Color: Red, Size: Large)",
    optionValuesMatch,
  );
  // 5. Pagination metadata contains correct total count
  TestValidator.predicate(
    "pagination current is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records matches data length or is >= 1",
    snapshots.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    snapshots.pagination.pages >= 1,
  );
}