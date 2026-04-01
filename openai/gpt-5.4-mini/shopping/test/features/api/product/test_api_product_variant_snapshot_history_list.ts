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

export async function test_api_product_variant_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "password1234";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `snapshot-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `sku-${RandomGenerator.alphabets(8)}`,
          optionValues: "Color: Red / Size: M",
          priceOverride: 12000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const firstPage =
    await api.functional.mallPlatform.seller.products.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("page 1 current", firstPage.pagination.current, 1);
  TestValidator.equals("page 1 limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records are non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages are non-negative",
    firstPage.pagination.pages >= 0,
  );
  if (firstPage.data.length > 0) {
    TestValidator.equals(
      "page 1 product scope",
      firstPage.data[0].product.id,
      product.id,
    );
    TestValidator.equals(
      "page 1 live product scope",
      firstPage.data[0].productVariant.product.id,
      product.id,
    );
    TestValidator.predicate(
      "page 1 createdAt present",
      firstPage.data[0].createdAt.length > 0,
    );
    TestValidator.predicate(
      "page 1 sku code present",
      firstPage.data[0].skuCode.length > 0,
    );
    TestValidator.predicate(
      "page 1 option summary present",
      firstPage.data[0].optionSummary.length > 0,
    );
  }
  const secondPage =
    await api.functional.mallPlatform.seller.products.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("page 2 current", secondPage.pagination.current, 2);
  TestValidator.equals("page 2 limit", secondPage.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 records are non-negative",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 2 pages are non-negative",
    secondPage.pagination.pages >= 0,
  );
  const defaultPage =
    await api.functional.mallPlatform.seller.products.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 10);
  if (firstPage.data.length > 0 && defaultPage.data.length > 0) {
    TestValidator.equals(
      "default first item matches newest page",
      defaultPage.data[0].id,
      firstPage.data[0].id,
    );
    TestValidator.equals(
      "default first product scope",
      defaultPage.data[0].product.id,
      product.id,
    );
    TestValidator.equals(
      "default first live product scope",
      defaultPage.data[0].productVariant.product.id,
      product.id,
    );
    TestValidator.equals(
      "live variant preserved in snapshots",
      defaultPage.data[0].productVariant.product.id,
      firstPage.data[0].productVariant.product.id,
    );
    TestValidator.predicate(
      "snapshot createdAt is present",
      defaultPage.data[0].createdAt.length > 0,
    );
  }
}
