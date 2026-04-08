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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_unavailable_no_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Seller creates product without variants
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<100>
          >(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Validate product was created with no variants
  TestValidator.equals("product variants array is empty", product.variants, []);
  // 4. Customer retrieves product (no auth required for viewing)
  const customerConnection: api.IConnection = { host: connection.host };
  const retrievedProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.products.at(customerConnection, {
      productId: product.id,
    });
  typia.assert(retrievedProduct);
  // 5. Validate product structure for unavailable product
  TestValidator.equals("product ID matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product deleted_at is NULL",
    retrievedProduct.deleted_at,
    null,
  );
  TestValidator.equals(
    "variants array is empty",
    retrievedProduct.variants,
    [],
  );
  TestValidator.equals("images array exists", retrievedProduct.images, []);
  TestValidator.equals(
    "category relationship joined",
    retrievedProduct.category.id,
    product.category.id,
  );
  TestValidator.equals(
    "seller relationship joined",
    retrievedProduct.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "review count is 0",
    retrievedProduct.reviewStats.review_count,
    0,
  );
  TestValidator.equals(
    "average rating is NULL",
    retrievedProduct.reviewStats.average_rating,
    null,
  );
}
