import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerCommunicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLog";
import type { IShoppingMallSellerCommunicationLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLogMetadata";
import { prepare_random_shopping_mall_seller_communication_log } from "../prepare/prepare_random_shopping_mall_seller_communication_log";
export async function generate_random_shopping_mall_seller_sellers_communication_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerCommunicationLog.ICreate> | undefined;
    params: {
      sellerId: string;
    };
  },
): Promise<IShoppingMallSellerCommunicationLog> {
  const prepared: IShoppingMallSellerCommunicationLog.ICreate =
    prepare_random_shopping_mall_seller_communication_log(props.body);
  return await api.functional.shoppingMall.seller.sellers.communication_logs.create(
    connection,
    {
      body: prepared,
      sellerId: props.params.sellerId,
    },
  );
}
