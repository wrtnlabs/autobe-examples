import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
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

export async function test_api_product_variant_snapshot_history_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await api.functional.mallPlatform.seller.products.create(
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
  typia.assert(product);
  const variant =
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: "Color: Red / Size: M",
          priceOverride: 12000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const variantId = typia.assert<string & tags.Format<"uuid">>(
    (variant as IMallPlatformProductVariant & { id: string }).id,
  );
  const variantSkuCode = typia.assert<string>(
    (variant as IMallPlatformProductVariant & { skuCode: string }).skuCode,
  );
  const firstUpdatedVariant =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: {
          skuCode: `${variantSkuCode}-v2`,
          optionValues: "Color: Blue / Size: L",
          priceOverride: 13000,
          isActive: true,
        } satisfies IMallPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(firstUpdatedVariant);
  const secondUpdatedVariant =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: {
          optionValues: "Color: Green / Size: XL",
          priceOverride: 14000,
          isActive: true,
        } satisfies IMallPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(secondUpdatedVariant);
  await api.functional.mallPlatform.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  const snapshots =
    await api.functional.mallPlatform.seller.productVariants.snapshots.at(
      sellerConnection,
      {
        productVariantId: variantId,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "snapshot history should remain available after product deletion",
    snapshots.data.length >= 2,
  );
  TestValidator.equals(
    "snapshot pagination should report the deleted variant",
    snapshots.data[0].productVariant.id,
    variantId,
  );
  TestValidator.equals(
    "snapshot pagination should preserve the parent product",
    snapshots.data[0].product.id,
    product.id,
  );
  TestValidator.predicate(
    "snapshot history should contain one of the edited variant states",
    snapshots.data.some(
      (snapshot) =>
        snapshot.skuCode === `${variantSkuCode}-v2` ||
        snapshot.optionSummary === "Color: Blue / Size: L" ||
        snapshot.optionSummary === "Color: Green / Size: XL",
    ),
  );
}
