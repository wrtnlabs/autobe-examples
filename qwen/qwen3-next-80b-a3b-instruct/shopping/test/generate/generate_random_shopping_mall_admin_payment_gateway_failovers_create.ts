import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentGatewayFailover } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayFailover";
import { prepare_random_shopping_mall_payment_gateway_failover } from "../prepare/prepare_random_shopping_mall_payment_gateway_failover";
export async function generate_random_shopping_mall_admin_payment_gateway_failovers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentGatewayFailover.ICreate>;
  },
): Promise<IShoppingMallPaymentGatewayFailover> {
  const prepared: IShoppingMallPaymentGatewayFailover.ICreate =
    prepare_random_shopping_mall_payment_gateway_failover(props.body);
  const result: IShoppingMallPaymentGatewayFailover =
    await api.functional.shoppingMall.admin.payment_gateway_failovers.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
