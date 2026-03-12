import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_admin_promotion_request } from "../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function generate_random_shopping_mall_admin_admin_promotion_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdminPromotionRequest.ICreate> | undefined;
  },
): Promise<IShoppingMallAdminPromotionRequest> {
  const prepared: IShoppingMallAdminPromotionRequest.ICreate =
    prepare_random_shopping_mall_admin_promotion_request(props.body);
  return await api.functional.shoppingMall.admin.adminPromotionRequests.create(
    connection,
    {
      body: prepared,
    },
  );
}
