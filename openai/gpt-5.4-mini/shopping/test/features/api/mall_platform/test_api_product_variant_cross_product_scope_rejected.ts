import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_product_variant_cross_product_scope_rejected(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.administrator.join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.seller.join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productIdOne = typia.random<string & tags.Format<"uuid">>();
  const productIdTwo = typia.random<string & tags.Format<"uuid">>();
  const firstVariant =
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: productIdOne,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: "color=red,size=m",
          priceOverride: 10000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  const secondVariant =
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: productIdTwo,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: "color=blue,size=l",
          priceOverride: 12000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  await TestValidator.httpError(
    "administrator product-variant lookup must reject a variant that belongs to another product",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.products.variants.at(
        administratorConnection,
        {
          productId: productIdOne,
          variantId: (
            secondVariant as IMallPlatformProductVariant & {
              id: string & tags.Format<"uuid">;
            }
          ).id,
        },
      );
    },
  );
}
