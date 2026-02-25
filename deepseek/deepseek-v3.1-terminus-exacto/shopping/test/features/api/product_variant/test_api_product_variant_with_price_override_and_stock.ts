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

export async function test_api_product_variant_with_price_override_and_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(seller);
  // 2. Create product with base price
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: 50,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies DeepPartial<IEcommerceProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Create variant with price_override and initial quantity
  const variantBody = {
    sku: RandomGenerator.alphaNumeric(10),
    option_values: JSON.stringify({ color: "blue", size: "M" }),
    price_override: 65,
    quantity: 30,
  } satisfies IEcommerceProductVariant.ICreate;
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: variantBody,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Validate variant creation
  // a) price_override is set and not null
  TestValidator.notEquals(
    "price_override should be set",
    variant.price_override,
    null,
  );
  TestValidator.equals(
    "price_override matches request",
    variant.price_override,
    65,
  );
  // b) quantity exactly matches request
  TestValidator.equals("quantity matches request", variant.quantity, 30);
  // c) quantity is integer
  TestValidator.predicate(
    "quantity is integer",
    Number.isInteger(variant.quantity),
  );
  // d) variant includes complete product summary
  TestValidator.equals("product id matches", variant.product.id, product.id);
  TestValidator.equals(
    "product base price matches",
    variant.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product seller id matches",
    variant.product.seller.id,
    seller.id,
  );
  // e) variant price_override overrides product base price (logic check)
  TestValidator.notEquals(
    "price_override differs from product base price",
    variant.price_override,
    product.base_price,
  );
}
