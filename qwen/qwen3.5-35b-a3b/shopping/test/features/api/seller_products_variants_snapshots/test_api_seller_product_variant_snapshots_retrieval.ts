import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_variant_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Test product for variant snapshots",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create initial variant
  const initialOptions = {
    color: "Red",
    size: "Large",
    material: "Cotton",
  } as const;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: initialOptions,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Retrieve snapshots for the variant
  const snapshots =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Validate response structure
  TestValidator.predicate(
    "response has valid pagination",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "response has data array",
    snapshots.data.length >= 0,
  );
  // 6. Verify pagination metadata
  const pagination = snapshots.pagination;
  TestValidator.predicate(
    "current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // 7. Verify at least one snapshot exists (from initial variant creation)
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshots.data.length >= 1,
  );
  // 8. Verify each snapshot has required fields (all validated by typia.assert)
  for (let i = 0; i < snapshots.data.length; i++) {
    const snapshot = snapshots.data[i];
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${i} has valid SKU code`,
      snapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${i} has options string`,
      typeof snapshot.options === "string",
    );
    TestValidator.predicate(
      `snapshot ${i} has valid price`,
      snapshot.price > 0,
    );
    TestValidator.predicate(
      `snapshot ${i} has valid stock quantity`,
      snapshot.stock_quantity >= 0,
    );
    TestValidator.predicate(
      `snapshot ${i} has valid status`,
      snapshot.status.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${i} has valid created_at`,
      snapshot.created_at.length > 0,
    );
  }
  // 9. Verify snapshots are ordered by created_at descending (newest first)
  for (let i = 1; i < snapshots.data.length; i++) {
    const currentCreated = new Date(snapshots.data[i - 1].created_at);
    const nextCreated = new Date(snapshots.data[i].created_at);
    TestValidator.predicate(
      `snapshot ${i - 1} should be newer than ${i}`,
      currentCreated >= nextCreated,
    );
  }
  // 10. Verify all snapshots have the same SKU code (variant identity preserved)
  const skuCodes = new Set(snapshots.data.map((s) => s.sku_code));
  TestValidator.equals(
    "all snapshots have same SKU",
    skuCodes.size,
    1 satisfies number,
  );
}
