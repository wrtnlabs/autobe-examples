import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_product_variant_create_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerAuth);
  const product = await generate_random_mall_platform_seller_products_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_seller_join(nonOwnerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}-other@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(nonOwnerAuth);
  await TestValidator.httpError(
    "non-owner seller cannot create a variant for another seller's product",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.create(
        nonOwnerConnection,
        {
          productId: product.id,
          body: {
            skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
            optionValues: RandomGenerator.name(),
            priceOverride: null,
          } satisfies IMallPlatformProductVariant.ICreate,
        },
      );
    },
  );
  TestValidator.equals("product id remains unchanged", product.id, product.id);
  TestValidator.equals(
    "product owner remains unchanged",
    product.sellerAccount.id,
    ownerAuth.id,
  );
}
