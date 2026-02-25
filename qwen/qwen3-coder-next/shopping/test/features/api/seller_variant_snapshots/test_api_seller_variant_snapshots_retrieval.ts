import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_variant_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url:
          Math.random() > 0.5
            ? null
            : typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  // Create new connection with seller token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerJoinResult.token.access },
  };
  // 2. Create product with variant
  const category = typia.random<IShoppingMallCategory.ISummary>();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAuthConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick(["red", "blue", "green"]),
              },
            ],
            stock_quantity: 100,
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  typia.assert(product.variants);
  const variant = product.variants[0];
  typia.assert(variant);
  // 3. Update variant to create first snapshot
  await api.functional.shoppingMall.seller.products.variants.update(
    sellerAuthConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price_override:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>() ||
          null,
      } satisfies IShoppingMallProductVariant.IUpdate,
    },
  );
  // 4. Update variant again to create second snapshot for pagination testing
  await api.functional.shoppingMall.seller.products.variants.update(
    sellerAuthConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price_override:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>() ||
          null,
      } satisfies IShoppingMallProductVariant.IUpdate,
    },
  );
  // 5. Retrieve snapshots
  const snapshotsResult =
    await api.functional.shoppingMall.seller.variants.snapshots(
      sellerAuthConnection,
      {
        variantId: variant.id,
      },
    );
  typia.assert(snapshotsResult);
  // 6. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof snapshotsResult.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current",
    snapshotsResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshotsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotsResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshotsResult.pagination.pages >= 1,
  );
  // 7. Validate snapshots data
  TestValidator.predicate(
    "has at least 2 snapshots",
    snapshotsResult.data.length >= 2,
  );
  // 8. Validate individual snapshot structure
  for (const snapshot of snapshotsResult.data) {
    typia.assert(snapshot);
    TestValidator.equals("snapshot has id", typeof snapshot.id, "string");
    TestValidator.equals(
      "snapshot has sku_code",
      typeof snapshot.sku_code,
      "string",
    );
    TestValidator.equals(
      "snapshot has option_values_json",
      typeof snapshot.option_values_json,
      "string",
    );
    TestValidator.equals(
      "snapshot has created_at",
      typeof snapshot.created_at,
      "string",
    );
    TestValidator.equals(
      "snapshot has updated_at",
      typeof snapshot.updated_at,
      "string",
    );
    // Validate price_override is null or number
    TestValidator.predicate(
      "price_override is valid",
      snapshot.price_override === null ||
        typeof snapshot.price_override === "number",
    );
    // Validate stock_quantity is valid integer
    TestValidator.predicate(
      "stock_quantity is valid integer",
      typeof snapshot.stock_quantity === "number" &&
        Number.isInteger(snapshot.stock_quantity),
    );
  }
  // 9. Verify snapshots are ordered by created_at descending
  if (snapshotsResult.data.length >= 2) {
    const firstSnapshot = snapshotsResult.data[0];
    const secondSnapshot = snapshotsResult.data[1];
    TestValidator.predicate(
      "snapshots ordered by created_at",
      firstSnapshot.created_at >= secondSnapshot.created_at,
    );
  }
}
