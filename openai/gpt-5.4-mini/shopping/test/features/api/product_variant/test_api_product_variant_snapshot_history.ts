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
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_product_variant_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "missing snapshot history should be handled as an HTTP error or empty page depending on backend state",
    async () => {
      const emptyHistory =
        await api.functional.mallPlatform.seller.productVariants.snapshots.at(
          sellerConnection,
          {
            productVariantId: variantId,
          },
        );
      typia.assert(emptyHistory);
    },
  );
  const firstSkuCode = typia.random<string>();
  const firstOptionValues = RandomGenerator.name();
  const firstPriceOverride = null;
  const firstUpdate =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          skuCode: firstSkuCode,
          optionValues: firstOptionValues,
          priceOverride: firstPriceOverride,
        } satisfies IMallPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  const secondSkuCode = `${firstSkuCode}-edited`;
  const secondOptionValues = `${firstOptionValues} updated`;
  const secondPriceOverride = firstPriceOverride === null ? 1000 : firstPriceOverride + 1;
  const secondUpdate =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          skuCode: secondSkuCode,
          optionValues: secondOptionValues,
          priceOverride: secondPriceOverride,
        } satisfies IMallPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  const history =
    await api.functional.mallPlatform.seller.productVariants.snapshots.at(
      sellerConnection,
      {
        productVariantId: variantId,
      },
    );
  typia.assert(history);
  TestValidator.predicate(
    "snapshot history pagination is valid",
    history.pagination.current >= 0 &&
      history.pagination.limit >= 0 &&
      history.pagination.records >= 0 &&
      history.pagination.pages >= 0,
  );
  TestValidator.equals(
    "snapshot history data count matches records",
    history.data.length,
    history.pagination.records,
  );
  if (history.data.length > 0) {
    const latest = history.data[0];
    typia.assert(latest);
    TestValidator.equals(
      "snapshot variant id preserved",
      latest.productVariant.id,
      variantId,
    );
    TestValidator.equals(
      "snapshot product id preserved",
      latest.product.id,
      productId,
    );
    TestValidator.equals(
      "latest snapshot sku matches edited value",
      latest.skuCode,
      secondSkuCode,
    );
    TestValidator.equals(
      "latest snapshot option values matches edited value",
      latest.optionSummary,
      secondOptionValues,
    );
    TestValidator.equals(
      "latest snapshot price matches edited value",
      latest.priceOverride,
      secondPriceOverride,
    );
    TestValidator.predicate(
      "snapshot timestamp exists",
      latest.createdAt.length > 0,
    );
  }
}
