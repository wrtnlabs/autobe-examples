import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_specification } from "../prepare/prepare_random_shopping_mall_sale_specification";

export async function generate_random_shopping_mall_seller_sale_specifications_create_sale_specification(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleSpecification.ICreate> | undefined;
  },
): Promise<IShoppingMallSaleSpecification> {
  const prepared: IShoppingMallSaleSpecification.ICreate =
    prepare_random_shopping_mall_sale_specification(props.body);
  const result: IShoppingMallSaleSpecification =
    await api.functional.shoppingMall.seller.sale_specifications.createSaleSpecification(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
