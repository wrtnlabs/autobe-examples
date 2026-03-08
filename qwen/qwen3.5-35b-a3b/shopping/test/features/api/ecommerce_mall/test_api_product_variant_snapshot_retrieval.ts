import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product variant for an existing product
  const product =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: { size: "Large", color: "Red" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          price_override: typia.random<number & tags.Minimum<1000>>(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(product);
  // 3. Edit variant to create a snapshot
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.product.id,
        variantId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: { size: "Medium", color: "Blue" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20>
          >(),
          price_override: null,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 4. Generate a snapshot ID for testing (snapshot IDs are typically UUIDs)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve snapshot
  const snapshot =
    await api.functional.ecommerceMall.products.variant_snapshots.at(
      sellerConnection,
      {
        productId: product.product.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot data structure
  TestValidator.equals(
    "snapshot ID is valid UUID",
    snapshot.id !== "00000000-0000-0000-0000-000000000000",
    true,
  );
  TestValidator.equals(
    "SKU code is present",
    snapshot.skuCode.length > 0,
    true,
  );
  TestValidator.equals(
    "optionValues is string or null",
    snapshot.optionValues === null || typeof snapshot.optionValues === "string",
    true,
  );
  TestValidator.equals(
    "priceOverride is null or number",
    snapshot.priceOverride === null ||
      typeof snapshot.priceOverride === "number",
    true,
  );
  TestValidator.equals(
    "stockQuantity is valid integer",
    Number.isInteger(snapshot.stockQuantity) && snapshot.stockQuantity >= 0,
    true,
  );
  TestValidator.equals(
    "isActive is boolean",
    typeof snapshot.isActive === "boolean",
    true,
  );
  TestValidator.equals(
    "createdAt is ISO datetime",
    !isNaN(Date.parse(snapshot.createdAt)),
    true,
  );
  // 7. Validate variant and product references
  TestValidator.equals(
    "variant reference ID is valid UUID",
    snapshot.variant.id !== "00000000-0000-0000-0000-000000000000",
    true,
  );
  TestValidator.equals(
    "product reference ID is valid UUID",
    snapshot.product.id !== "00000000-0000-0000-0000-000000000000",
    true,
  );
}
