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

export async function test_api_product_variant_update_success_and_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd",
      href: "https://example.com/seller/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number>(),
      },
    },
  );
  typia.assert(product);
  const createdVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: "color: red, size: large",
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(createdVariant);
  const createdVariantId = (createdVariant as IMallPlatformProductVariant & {
    id: string & tags.Format<"uuid">;
  }).id;
  const firstUpdateBody = {
    skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    optionValues: "color: blue, size: medium",
    priceOverride: product.basePrice + 100,
    isActive: false,
  } satisfies IMallPlatformProductVariant.IUpdate;
  const updatedVariant1 =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: createdVariantId,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedVariant1);
  TestValidator.equals(
    "inactive variant should be unavailable",
    updatedVariant1.status,
    "unavailable",
  );
  const secondUpdateBody = {
    skuCode: `SKU-${RandomGenerator.alphaNumeric(12)}`,
    optionValues: "color: green, size: small",
    priceOverride: null,
    isActive: true,
  } satisfies IMallPlatformProductVariant.IUpdate;
  const updatedVariant2 =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: createdVariantId,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedVariant2);
  TestValidator.equals(
    "reactivated variant should be available",
    updatedVariant2.status,
    "available",
  );
  TestValidator.notEquals(
    "successive updates should change the variant status",
    updatedVariant1.status,
    updatedVariant2.status,
  );
}
