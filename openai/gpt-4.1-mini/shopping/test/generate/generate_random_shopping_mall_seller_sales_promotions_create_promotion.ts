import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_promotion } from "../prepare/prepare_random_shopping_mall_sale_promotion";

export async function generate_random_shopping_mall_seller_sales_promotions_create_promotion(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSalePromotion.ICreate> | undefined;
    params: {
      saleId: string;
    };
  },
): Promise<IShoppingMallSalePromotion> {
  const prepared: IShoppingMallSalePromotion.ICreate =
    prepare_random_shopping_mall_sale_promotion(props.body);
  const result: IShoppingMallSalePromotion =
    await api.functional.shoppingMall.seller.sales.promotions.createPromotion(
      connection,
      {
        saleId: props.params.saleId,
        body: prepared,
      },
    );
  return result;
}
