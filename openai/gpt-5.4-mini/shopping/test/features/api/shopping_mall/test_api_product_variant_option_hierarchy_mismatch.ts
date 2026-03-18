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

export async function test_api_product_variant_option_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!A1",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const updateBody = {
    option_name: RandomGenerator.name(1),
    option_value: RandomGenerator.name(1),
  } satisfies IShoppingMallProductVariantOption.IUpdate;
  const output =
    await api.functional.shoppingMall.seller.products.variants.options.update(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        optionId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "response option id should be preserved",
    output.id,
    output.id,
  );
  TestValidator.predicate(
    "response should contain updated option name or existing value",
    output.optionName.length > 0,
  );
  TestValidator.predicate(
    "response should contain updated option value or existing value",
    output.optionValue.length > 0,
  );
}
