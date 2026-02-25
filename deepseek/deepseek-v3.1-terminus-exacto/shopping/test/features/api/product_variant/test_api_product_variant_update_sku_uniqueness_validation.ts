import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_variant_update_sku_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Create first product and variant
  const product1 = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product1);
  const uniqueSku1 = RandomGenerator.alphaNumeric(10);
  const variant1 =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product1.id,
        body: {
          sku: uniqueSku1,
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Step 3: Create second product and variant with different SKU
  const product2 = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product2);
  const uniqueSku2 = RandomGenerator.alphaNumeric(10);
  const variant2 =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product2.id,
        body: {
          sku: uniqueSku2,
          option_values: JSON.stringify({ color: "blue", size: "L" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Step 4: Attempt to update variant2's SKU to match variant1's SKU (should fail)
  await TestValidator.error("SKU uniqueness validation failure", async () => {
    await api.functional.ecommerce.seller.products.variants.update(
      sellerConnection,
      {
        productId: product2.id,
        variantId: variant2.id,
        body: {
          sku: uniqueSku1, // Attempt to use duplicate SKU
        } satisfies IEcommerceProductVariant.IUpdate,
      },
    );
  });
  // Step 5: Verify original SKU is preserved by fetching variant2 again
  const verifiedVariant =
    await api.functional.ecommerce.seller.products.variants.update(
      sellerConnection,
      {
        productId: product2.id,
        variantId: variant2.id,
        body: {
          // Only update other fields, not SKU
          option_values: JSON.stringify({ color: "blue", size: "L" }),
        } satisfies IEcommerceProductVariant.IUpdate,
      },
    );
  typia.assert(verifiedVariant);
  // Step 6: Validate SKU remains unchanged
  TestValidator.equals(
    "SKU preserved after failed update attempt",
    verifiedVariant.sku,
    uniqueSku2,
  );
  TestValidator.notEquals(
    "SKU not matching attempted duplicate",
    verifiedVariant.sku,
    uniqueSku1,
  );
}
