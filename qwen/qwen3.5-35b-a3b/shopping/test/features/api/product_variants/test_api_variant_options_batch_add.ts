import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_variant_options_batch_add(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? undefined,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Update sellerConnection with token
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = seller.token.access;
  // 2. Create product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: categoryId,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Create variant without options
  const variant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: {},
          base_price: product.base_price,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Add options via batch update
  const addedOptions = [
    { action: "add" as const, key: "color", value: "Red" },
    { action: "add" as const, key: "size", value: "Large" },
    { action: "add" as const, key: "material", value: "Cotton" },
  ];
  const updatedVariant: IEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.seller.products.variants.options.updateOptions(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          operations: addedOptions,
        } satisfies IEcommerceMallProductVariant.IUpdateOption,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate options are correctly stored
  const parsedOptions: {
    [key: string]: string;
  } = updatedVariant.options;
  for (const op of addedOptions) {
    if (op.action === "add") {
      TestValidator.equals(
        `option ${op.key} added`,
        parsedOptions[op.key] ?? "",
        op.value,
      );
    }
  }
  // 6. Validate variant status
  TestValidator.equals(
    "variant status active",
    updatedVariant.status,
    "active",
  );
  // 7. Validate variant details
  TestValidator.equals("sku matches", updatedVariant.sku, variant.sku);
  TestValidator.equals(
    "base price matches",
    updatedVariant.basePrice,
    variant.basePrice,
  );
  TestValidator.equals(
    "stock quantity matches",
    updatedVariant.stockQuantity,
    variant.stockQuantity,
  );
  // 8. Validate product relationship
  TestValidator.equals(
    "variant product id matches",
    updatedVariant.product.id,
    product.id,
  );
}