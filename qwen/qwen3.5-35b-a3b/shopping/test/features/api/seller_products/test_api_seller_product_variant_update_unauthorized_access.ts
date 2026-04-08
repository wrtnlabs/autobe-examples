import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
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

export async function test_api_seller_product_variant_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email addresses for two independent seller accounts
  const sellerAEmail = RandomGenerator.alphaNumeric(12) + "@sellerA.com";
  const sellerBEmail = RandomGenerator.alphaNumeric(12) + "@sellerB.com";
  // 1. Register Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: "test1234",
      display_name: RandomGenerator.name(2),
      href: "https://sellerA.test.com",
      referrer: "https://sellerA.test.com/register",
    },
  });
  typia.assert(sellerAAuth);
  // 2. Register Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: "test1234",
      display_name: RandomGenerator.name(2),
      href: "https://sellerB.test.com",
      referrer: "https://sellerB.test.com/register",
    },
  });
  typia.assert(sellerBAuth);
  // 3. Seller A creates Product A
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: "Seller A Product",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 4. Seller A creates Variant A for Product A
  const variantA =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: "SKU-A1",
          option_values: JSON.stringify({ size: "M", color: "blue" }),
          stock_quantity: 10,
        },
      },
    );
  typia.assert(variantA);
  // 5. Seller B creates Product B
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: "Seller B Product",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 6. Seller B creates Variant B for Product B
  const variantB =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: "SKU-B1",
          option_values: JSON.stringify({ size: "L", color: "red" }),
          stock_quantity: 20,
        },
      },
    );
  typia.assert(variantB);
  // 7. Verify Variant B's initial stock
  const initialStockB = variantB.stock_quantity;
  TestValidator.equals("Variant B initial stock", initialStockB, 20);
  // 8. Attempt unauthorized update: Use Seller B's connection but Product A's ID
  // This should return 403 Forbidden because the variant doesn't belong to Product A
  await TestValidator.httpError(
    "should reject cross-product variant update with 403",
    [403],
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.update(
        sellerBConnection,
        {
          productId: productA.id,
          variantId: variantB.id,
          body: {
            stock_quantity: 100,
          },
        },
      );
    },
  );
  // 9. Verify Variant B's stock remains unchanged (update failed)
  TestValidator.equals(
    "Variant B stock unchanged after failed update",
    initialStockB,
    20,
  );
}
