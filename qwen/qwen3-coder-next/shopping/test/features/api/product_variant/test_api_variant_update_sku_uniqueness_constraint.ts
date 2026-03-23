import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_variant_update_sku_uniqueness_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller registers and creates product with initial variant
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(firstSeller);
  const firstProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      firstSellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          variants: [
            {
              sku_code: typia.random<string & tags.Format<"uuid">>(),
              price_override: null,
            } satisfies IEcommerceMallProductVariant.ICreate,
          ],
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(firstProduct);
  // 2. Second seller registers and creates product with second variant
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(secondSeller);
  const secondProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      secondSellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          variants: [
            {
              sku_code: typia.random<string & tags.Format<"uuid">>(),
              price_override: null,
            } satisfies IEcommerceMallProductVariant.ICreate,
          ],
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(secondProduct);
  // 3. First seller attempts to update their variant's SKU to existing SKU
  await TestValidator.error("SKU uniqueness constraint violation", async () => {
    await api.functional.ecommerceMall.seller.products.variants.updateVariant(
      firstSellerConnection,
      {
        productId: firstProduct.id,
        variantId: firstProduct.variants[0].id,
        body: {
          sku_code: secondProduct.variants[0].sku_code, // Existing SKU from second seller
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  });
}