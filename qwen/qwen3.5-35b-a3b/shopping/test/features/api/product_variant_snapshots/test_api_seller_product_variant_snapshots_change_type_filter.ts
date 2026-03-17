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

export async function test_api_seller_product_variant_snapshots_change_type_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Seller creates a new product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Create initial variant (creates 'created' snapshot)
  const initialVariant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: { size: "Large", color: "Red" },
          base_price: 15000,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
        params: { productId: product.id },
      },
    );
  typia.assert(initialVariant);
  // 4. Create additional variants to generate multiple snapshots
  const updatedVariant1: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: { size: "Large", color: "Blue" },
          base_price: 18000,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
        params: { productId: product.id },
      },
    );
  typia.assert(updatedVariant1);
  const updatedVariant2: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: { size: "Small", color: "Red" },
          base_price: 12000,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
        params: { productId: product.id },
      },
    );
  typia.assert(updatedVariant2);
  // 5. Retrieve snapshots filtered by change_type='updated'
  const updatedSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          changeType: "updated",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(updatedSnapshots);
  // 6. Retrieve snapshots filtered by change_type='created'
  const createdSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          changeType: "created",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(createdSnapshots);
  // 7. Retrieve snapshots filtered by change_type='deleted'
  const deletedSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          changeType: "deleted",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(deletedSnapshots);
  // 8. Validate filtering by change_type='created' returns exactly one snapshot
  TestValidator.equals(
    "created snapshots count",
    createdSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "created pagination records",
    createdSnapshots.pagination.records,
    1,
  );
  // 9. Validate filtering by change_type='deleted' returns empty result
  TestValidator.equals(
    "deleted snapshots count",
    deletedSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "deleted pagination records",
    deletedSnapshots.pagination.records,
    0,
  );
  // 10. Validate pagination metadata reflects filtered results
  TestValidator.equals(
    "updated pagination records match data length",
    updatedSnapshots.pagination.records,
    updatedSnapshots.data.length,
  );
  // 11. Validate snapshots contain complete state data - check snapshot properties exist
  if (createdSnapshots.data.length > 0) {
    const createdSnapshot: IEcommerceMallProductVariantSnapshot.ISummary =
      createdSnapshots.data[0];
    typia.assert(createdSnapshot);
    // Snapshot contains all required fields per IEcommerceMallProductVariantSnapshot.ISummary
    // - id: uuid
    // - sku_code: string
    // - options: string
    // - price: number
    // - stock_quantity: int32
    // - status: string
    // - created_at: date-time
    TestValidator.equals(
      "created snapshot sku_code is non-empty",
      createdSnapshot.sku_code.length > 0,
      true,
    );
    TestValidator.equals(
      "created snapshot has valid price",
      typeof createdSnapshot.price === "number" && createdSnapshot.price > 0,
      true,
    );
    TestValidator.equals(
      "created snapshot has valid stock_quantity",
      typeof createdSnapshot.stock_quantity === "number" &&
        createdSnapshot.stock_quantity >= 0,
      true,
    );
  }
  // 12. Validate ordering is by created_at descending
  if (updatedSnapshots.data.length >= 2) {
    for (let i = 1; i < updatedSnapshots.data.length; i++) {
      const prevSnapshot: IEcommerceMallProductVariantSnapshot.ISummary =
        updatedSnapshots.data[i - 1];
      const currSnapshot: IEcommerceMallProductVariantSnapshot.ISummary =
        updatedSnapshots.data[i];
      TestValidator.predicate(
        "snapshots ordered by created_at descending",
        () =>
          new Date(prevSnapshot.created_at) >=
          new Date(currSnapshot.created_at),
      );
    }
  }
}