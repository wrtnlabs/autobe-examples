import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_variants_list_own_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: `Pw${RandomGenerator.alphabets(10)}!`,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Primary ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        categoryId: null,
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  const response =
    await api.functional.mallPlatform.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariant.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all variants are scoped to the requested product",
    response.data.every((variant) => variant.product.id === product.id),
  );
  TestValidator.predicate(
    "all variants include sku code when present",
    response.data.every((variant) => variant.skuCode.length > 0),
  );
  TestValidator.predicate(
    "all variants include option values when present",
    response.data.every((variant) => variant.optionValues.length > 0),
  );
  TestValidator.predicate(
    "all variants expose active state",
    response.data.every((variant) => typeof variant.isActive === "boolean"),
  );
  TestValidator.predicate(
    "all variants expose parent product summary",
    response.data.every(
      (variant) =>
        variant.product.id === product.id &&
        variant.product.name.length > 0 &&
        variant.product.description.length > 0,
    ),
  );
  TestValidator.predicate(
    "price override is either null or a valid number",
    response.data.every(
      (variant) => variant.priceOverride === null || variant.priceOverride >= 0,
    ),
  );
}
