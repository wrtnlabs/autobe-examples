import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentGatewayFailover } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayFailover";
export function prepare_random_shopping_mall_payment_gateway_failover(
  input?: DeepPartial<IShoppingMallPaymentGatewayFailover.ICreate> | undefined,
): IShoppingMallPaymentGatewayFailover.ICreate {
  return {
    priority:
      input?.priority ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    timeoutThreshold:
      input?.timeoutThreshold ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<30000>
      >(),
    paymentGatewayId:
      input?.paymentGatewayId ?? typia.random<string & tags.Format<"uuid">>(),
    maxRetryCount:
      input?.maxRetryCount ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>
      >(),
  };
}
