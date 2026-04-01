import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
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

export async function test_api_inventory_history_variant_audit_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const sellerSession: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  const product = await generate_random_mall_platform_seller_products_create(
    sellerSession,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 1000,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerSession,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: "color: red, size: large",
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const variantId = (variant as IMallPlatformProductVariant & { id: string }).id;
  const history =
    await api.functional.mallPlatform.seller.products.variants.inventoryHistory.at(
      sellerSession,
      {
        productId: product.id,
        variantId,
      },
    );
  typia.assert(history);
  TestValidator.equals(
    "inventory history is scoped to the requested variant",
    history.data.every((record) => record.productVariant.id === variantId),
    true,
  );
  TestValidator.equals(
    "inventory history pagination current page defaults to first page",
    history.pagination.current,
    1,
  );
  TestValidator.predicate(
    "inventory history pagination limit is non-negative",
    history.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "inventory history pagination records is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "inventory history pagination pages is non-negative",
    history.pagination.pages >= 0,
  );
  for (const record of history.data) {
    typia.assert(record);
    TestValidator.equals(
      "inventory record belongs to target variant",
      record.productVariant.id,
      variantId,
    );
    TestValidator.predicate(
      "inventory quantity change is signed",
      Number.isInteger(record.quantityChange),
    );
    TestValidator.predicate(
      "inventory reason is preserved",
      record.reason.length > 0,
    );
  }
  for (let i = 1; i < history.data.length; i++) {
    TestValidator.predicate(
      "inventory history is ordered consistently by createdAt",
      history.data[i - 1].createdAt <= history.data[i].createdAt,
    );
  }
}
