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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_update_another_sellers_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as seller_a and create first seller account
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Create a product as seller_a
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Store original product details to verify no changes
  const originalSellerId = product.seller_id;
  const originalName = product.name;
  const originalBasePrice = product.base_price;
  // 3. Join as seller_b to create second seller account
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 4. Attempt to update seller_a's product using seller_b's session
  // This should fail with 403 Forbidden due to ownership violation
  await TestValidator.httpError(
    "should reject update on another seller's product",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.update(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            name: "Attempted Update",
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      );
    },
  );
  // 5. Validate that product details were not modified by the failed attempt
  TestValidator.equals(
    "seller ownership unchanged after failed update",
    product.seller_id,
    originalSellerId,
  );
  TestValidator.equals(
    "name unchanged after failed update",
    product.name,
    originalName,
  );
  TestValidator.equals(
    "price unchanged after failed update",
    product.base_price,
    originalBasePrice,
  );
  // 6. Verify the product still belongs to seller_a (not seller_b)
  TestValidator.equals(
    "product owner is seller_a",
    product.seller_id,
    sellerA.id,
  );
}
