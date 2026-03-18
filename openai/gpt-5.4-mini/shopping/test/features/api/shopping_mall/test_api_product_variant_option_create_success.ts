import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_variants_options_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_options_create";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_variant_option_create_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies IShoppingMallSeller.IJoin["password"],
    } satisfies IShoppingMallSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const optionName = `${RandomGenerator.name(1)}_option`;
  const optionValue = `${RandomGenerator.name(1)}_value`;
  const output =
    await generate_random_shopping_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: {
          productId,
          variantId,
        },
        body: {
          option_name: `  ${optionName}  `,
          option_value: `  ${optionValue}  `,
        } satisfies IShoppingMallProductVariantOption.ICreate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "option name should be normalized",
    output.optionName,
    optionName,
  );
  TestValidator.equals(
    "option value should be normalized",
    output.optionValue,
    optionValue,
  );
  TestValidator.equals(
    "variant id should match the parent context",
    output.productVariant.id,
    variantId,
  );
  TestValidator.predicate(
    "parent variant summary should include sku code",
    output.productVariant.skuCode.length > 0,
  );
}
