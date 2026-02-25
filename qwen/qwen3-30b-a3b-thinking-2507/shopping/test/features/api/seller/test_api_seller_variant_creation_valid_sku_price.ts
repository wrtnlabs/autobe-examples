import api from '@ORGANIZATION/PROJECT-api';
import type { IAuthorizationToken } from '@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken';
import type { IEcommerceCategory } from '@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory';
import type { IEcommerceProduct } from '@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct';
import type { IEcommerceProductImage } from '@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage';
import type { IEcommerceProductVariant } from '@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant';
import type { IEcommerceSeller } from '@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller';
import { IEntity } from '@ORGANIZATION/PROJECT-api/lib/structures/IEntity';
import { DeepPartial } from '@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial';
import { ArrayUtil, RandomGenerator, TestValidator } from '@nestia/e2e';
import { IConnection } from '@nestia/fetcher';
import { randint } from 'tstl';
import typia, { tags } from 'typia';

import { authorize_seller_join } from '../../../authorize/authorize_seller_join';
import { authorize_seller_login } from '../../../authorize/authorize_seller_login';
import { authorize_seller_refresh } from '../../../authorize/authorize_seller_refresh';
import { generate_random_ecommerce_seller_products_create } from '../../../generate/generate_random_ecommerce_seller_products_create';
import { generate_random_ecommerce_seller_products_variants_create } from '../../../generate/generate_random_ecommerce_seller_products_variants_create';
import { prepare_random_ecommerce_product } from '../../../prepare/prepare_random_ecommerce_product';
import { prepare_random_ecommerce_product_variant } from '../../../prepare/prepare_random_ecommerce_product_variant';

export async function test_api_seller_variant_creation_valid_sku_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Product creation
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Product variant creation - store price to verify after creation
  const price = typia.random<number>() satisfies number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>;
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-" + RandomGenerator.alphaNumeric(8),
          price: price,
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Verification
  TestValidator.equals(
    "SKU matches input",
    variant.sku_code,
    "SKU-" + RandomGenerator.alphaNumeric(8),
  );
  TestValidator.equals("Price matches input", variant.price, price);
}
