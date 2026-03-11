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

export async function test_api_seller_product_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(joinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: shopName,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Login as seller to get authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(seller);
  // 3. Create product with valid data using placeholder category ID
  const productName = RandomGenerator.name();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        is_available: true,
        category_id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
        images: [
          {
            files: ["https://example.com/test-image.jpg"],
          },
        ],
        variants: [],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Validate product properties
  TestValidator.equals("seller ID matches", product.seller.id, seller.id);
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.predicate("base price positive", product.basePrice > 0);
  TestValidator.equals("is available", product.isAvailable, true);
  TestValidator.equals("has 1 image", product.images.length, 1);
  TestValidator.equals("has no variants", product.variants.length, 0);
  TestValidator.predicate("has valid ID", /^[0-9a-f-]{36}$/i.test(product.id));
}
