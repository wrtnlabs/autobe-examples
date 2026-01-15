import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentGatewayFailover } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayFailover";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentGatewayFailoverCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentGatewayFailover.ICreate;
  }) {
    return {
      id: v4(),
      primary_gateway: props.body.paymentGatewayId,
      secondary_gateway: null,
      tertiary_gateway: null,
      last_failover_at: null,
      failover_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_payment_gateway_failoversCreateInput;
  }
}
