import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_admin_promotion_request } from "../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function generate_random_shopping_mall_seller_admin_promotion_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdminPromotionRequest.ICreate>;
  },
): Promise<IShoppingMallAdminPromotionRequest> {
  const prepared: IShoppingMallAdminPromotionRequest.ICreate =
    prepare_random_shopping_mall_admin_promotion_request(props.body);
  const result: IShoppingMallAdminPromotionRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
