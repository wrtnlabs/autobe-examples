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

export async function test_api_seller_product_variant_snapshots_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      },
    },
  );
  typia.assert(seller);
  // Update seller connection with token
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: seller.token.access,
  };
  // 2. Create product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 10000,
        },
      },
    );
  typia.assert(product);
  // 3. Create initial variant with specific SKU, options, price, and stock
  const initialPrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const initialStock: number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.Maximum<1000> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
  >();
  const variantSku: string = RandomGenerator.alphaNumeric(12).toUpperCase();
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: variantSku,
          options: {
            size: "Large",
            color: "Blue",
            material: "Cotton",
          },
          base_price: initialPrice,
          stock_quantity: initialStock,
          status: "active",
          is_default: true,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Verify initial snapshot was created for variant
  const initialSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(initialSnapshots);
  // 5. Validate at least one snapshot exists
  TestValidator.equals(
    "initial variant has snapshot",
    initialSnapshots.data.length,
    1,
  );
  // 6. Validate first snapshot captures initial variant state
  const firstSnapshot: IEcommerceMallProductVariantSnapshot.ISummary =
    initialSnapshots.data[0];
  typia.assert(firstSnapshot);
  // Verify SKU code preserved correctly
  TestValidator.equals(
    "snapshot SKU code matches variant",
    firstSnapshot.sku_code,
    variantSku,
  );
  // Verify price captured correctly
  TestValidator.equals(
    "snapshot price matches initial",
    firstSnapshot.price,
    initialPrice,
  );
  // Verify stock quantity captured correctly
  TestValidator.equals(
    "snapshot stock quantity matches initial",
    firstSnapshot.stock_quantity,
    initialStock,
  );
  // Verify status captured correctly
  TestValidator.equals(
    "snapshot status matches initial",
    firstSnapshot.status,
    "active",
  );
  // Verify created_at timestamp is valid
  TestValidator.predicate(
    "snapshot has valid created_at timestamp",
    () => !isNaN(new Date(firstSnapshot.created_at).getTime()),
  );
  // 7. Test options preservation as JSON string
  const optionsParsed: {
    [key: string]: string;
  } = JSON.parse(firstSnapshot.options);
  TestValidator.equals("options size preserved", optionsParsed.size, "Large");
  TestValidator.equals("options color preserved", optionsParsed.color, "Blue");
  TestValidator.equals(
    "options material preserved",
    optionsParsed.material,
    "Cotton",
  );
  // 8. Test date range filtering - query from snapshot time to now
  const fromDate: string = firstSnapshot.created_at;
  const toDate: string = new Date().toISOString();
  const filteredSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          fromDate,
          toDate,
          limit: 100,
        },
      },
    );
  typia.assert(filteredSnapshots);
  TestValidator.equals(
    "date range filter returns snapshots in range",
    filteredSnapshots.data.length,
    initialSnapshots.data.length,
  );
  // 9. Test pagination - retrieve first page with limited results
  const paginatedSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit enforced",
    paginatedSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSnapshots.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination total records",
    paginatedSnapshots.pagination.records,
    1,
  );
  // 10. Verify snapshot immutability - retrieve again and confirm data unchanged
  const laterSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(laterSnapshots);
  TestValidator.equals(
    "snapshot immutability - count unchanged",
    laterSnapshots.data.length,
    initialSnapshots.data.length,
  );
  TestValidator.equals(
    "snapshot immutability - price unchanged",
    laterSnapshots.data[0].price,
    firstSnapshot.price,
  );
  TestValidator.equals(
    "snapshot immutability - stock unchanged",
    laterSnapshots.data[0].stock_quantity,
    firstSnapshot.stock_quantity,
  );
  // 11. Test changeType filter - filter by "created"
  const createdTypeSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          changeType: "created",
          limit: 100,
        },
      },
    );
  typia.assert(createdTypeSnapshots);
  TestValidator.equals(
    "created type filter returns snapshots",
    createdTypeSnapshots.data.length,
    1,
  );
  // 12. Test search by SKU code
  const skuSearchSnapshots: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          search: variantSku.substring(0, 5),
          limit: 100,
        },
      },
    );
  typia.assert(skuSearchSnapshots);
  TestValidator.equals(
    "SKU search filter returns matching snapshots",
    skuSearchSnapshots.data.length,
    1,
  );
  // 13. Test that all snapshots preserve SKU code immutably
  for (const snapshot of laterSnapshots.data) {
    TestValidator.equals(
      `snapshot SKU code preserved (created_at: ${snapshot.created_at})`,
      snapshot.sku_code,
      variantSku,
    );
  }
  // 14. Test complete variant state reconstruction from snapshots
  // For dispute resolution, we should be able to reconstruct variant state
  const reconstructedVariant = {
    sku_code: firstSnapshot.sku_code,
    options: firstSnapshot.options,
    price: firstSnapshot.price,
    stock_quantity: firstSnapshot.stock_quantity,
    status: firstSnapshot.status,
    created_at: firstSnapshot.created_at,
  };
  // Validate all reconstructed fields are valid
  TestValidator.equals(
    "reconstructed SKU code valid",
    reconstructedVariant.sku_code.length > 0,
    true,
  );
  TestValidator.predicate(
    "reconstructed options valid JSON",
    () => {
      try {
        JSON.parse(reconstructedVariant.options);
        return true;
      } catch {
        return false;
      }
    },
  );
  TestValidator.predicate(
    "reconstructed price is positive",
    reconstructedVariant.price > 0,
  );
  TestValidator.predicate(
    "reconstructed stock is non-negative",
    reconstructedVariant.stock_quantity >= 0,
  );
}