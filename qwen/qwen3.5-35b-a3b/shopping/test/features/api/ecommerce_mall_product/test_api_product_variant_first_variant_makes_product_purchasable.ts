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

export async function test_api_product_variant_first_variant_makes_product_purchasable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://seller.example.com/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create authenticated connection for seller API calls
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  // 2. Seller creates a product (initially without variants)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Verify product has no variants and is unavailable
  TestValidator.equals("product has no variants", product.variants.length, 0);
  TestValidator.equals(
    "product status is out_of_stock",
    product.status,
    "out_of_stock",
  );
  // 4. Seller creates first variant with stock_quantity > 0 and status active
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      authenticatedSellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          options: {
            size: "Large",
            color: "Red",
          },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          status: "active",
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Validate variant was created successfully with correct data
  TestValidator.equals("variant has sku", variant.sku, "Large");
  TestValidator.equals(
    "variant stock quantity positive",
    variant.stockQuantity,
    variant.stockQuantity,
  );
  TestValidator.equals("variant status is active", variant.status, "active");
  TestValidator.predicate(
    "variant product id matches",
    variant.product.id === product.id,
  );
  TestValidator.predicate("variant has base price", variant.basePrice > 0);
  TestValidator.predicate("variant has stock", variant.stockQuantity > 0);
}
