import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_product_variant_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Generate random product ID (simulating existing product)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create product variant with valid data
  const body: IEcommerceMallProductVariant.ICreate = {
    sku: RandomGenerator.alphaNumeric(12),
    options: {
      size: "Large",
      color: "Red",
    } satisfies {
      [key: string]: string;
    },
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    stock_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    status: "active",
    sort_order: 0,
    is_default: false,
  } satisfies IEcommerceMallProductVariant.ICreate;
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      { productId, body },
    );
  typia.assert(variant);
  // 4. Validate response contains all variant fields
  TestValidator.equals("variant has id", variant.id !== undefined, true);
  TestValidator.equals("variant sku matches input", variant.sku, body.sku);
  TestValidator.equals(
    "variant has options",
    variant.options !== undefined,
    true,
  );
  TestValidator.equals(
    "variant basePrice positive",
    variant.basePrice > 0,
    true,
  );
  TestValidator.equals(
    "variant salePrice is null",
    variant.salePrice === null,
    true,
  );
  TestValidator.equals(
    "variant stockQuantity non-negative",
    variant.stockQuantity >= 0,
    true,
  );
  TestValidator.equals(
    "variant reservedQuantity zero",
    variant.reservedQuantity === 0,
    true,
  );
  TestValidator.equals(
    "variant status is active",
    variant.status === "active",
    true,
  );
  TestValidator.equals(
    "variant sortOrder is zero",
    variant.sortOrder === 0,
    true,
  );
  TestValidator.equals(
    "variant isDefault is false",
    variant.isDefault === false,
    true,
  );
  TestValidator.equals(
    "variant has createdAt",
    variant.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "variant has updatedAt",
    variant.updatedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "variant deletedAt is null",
    variant.deletedAt === null,
    true,
  );
  TestValidator.equals(
    "variant has product reference",
    variant.product.id !== undefined,
    true,
  );
  // 5. Validate product summary fields
  TestValidator.equals(
    "product id exists",
    variant.product.id !== undefined,
    true,
  );
  TestValidator.equals(
    "product name exists",
    variant.product.name !== undefined,
    true,
  );
  TestValidator.equals(
    "product base_price positive",
    variant.product.base_price > 0,
    true,
  );
  TestValidator.equals(
    "product slug exists",
    variant.product.slug !== undefined,
    true,
  );
  TestValidator.equals(
    "product status exists",
    variant.product.status !== undefined,
    true,
  );
  TestValidator.equals(
    "product category exists",
    variant.product.category.id !== undefined,
    true,
  );
  TestValidator.equals(
    "product deleted_at is null",
    variant.product.deleted_at === null,
    true,
  );
  // 6. Validate SKU uniqueness by attempting duplicate creation
  const duplicateBody: IEcommerceMallProductVariant.ICreate = {
    ...body,
    sku: body.sku,
  } satisfies IEcommerceMallProductVariant.ICreate;
  await TestValidator.error(
    "duplicate SKU should fail",
    async () =>
      await api.functional.ecommerceMall.seller.products.variants.create(
        sellerConnection,
        { productId, body: duplicateBody },
      ),
  );
}
