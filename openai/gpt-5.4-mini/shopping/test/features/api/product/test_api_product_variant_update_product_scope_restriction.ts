import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function test_api_product_variant_update_product_scope_restriction(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productA = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(productA);
  const productB = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 12000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(productB);
  const variant = await generate_random_mall_platform_seller_products_variants_create(
    sellerConnection,
    {
      params: { productId: productA.id },
      body: {
        skuCode: RandomGenerator.alphaNumeric(12),
        optionValues: "Color: Red / Size: M",
        priceOverride: 13000,
      } satisfies IMallPlatformProductVariant.ICreate,
    },
  );
  typia.assert(variant);
  const variantId = (variant as IMallPlatformProductVariant & { id: string }).id;
  await TestValidator.httpError(
    "mismatched product and variant scope must be rejected",
    [400, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.update(
        sellerConnection,
        {
          productId: productB.id,
          variantId,
          body: {
            skuCode: RandomGenerator.alphaNumeric(12),
            optionValues: "Color: Blue / Size: L",
            priceOverride: 14000,
          } satisfies IMallPlatformProductVariant.IUpdate,
        },
      );
    },
  );
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(otherSeller);
  await TestValidator.httpError(
    "non-owner seller must be rejected from updating another seller's variant",
    [400, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.update(
        otherSellerConnection,
        {
          productId: productA.id,
          variantId,
          body: {
            skuCode: RandomGenerator.alphaNumeric(12),
            optionValues: "Color: Green / Size: S",
            priceOverride: 15000,
          } satisfies IMallPlatformProductVariant.IUpdate,
        },
      );
    },
  );
}
