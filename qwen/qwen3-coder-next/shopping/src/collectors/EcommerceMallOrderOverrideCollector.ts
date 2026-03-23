import { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderOverrideCollector {
  export async function collect(props: {
    body: IEcommerceMallOrderOverride.ICreate;
    ecommerceMallAdmins: IEntity;
    ecommerceMallCustomers: IEntity;
    ecommerceMallSellers: IEntity;
    ecommerceMallOrders: IEntity;
    ecommerceMallOrderItems: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      action_type: props.body.action_type,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      adminUser: { connect: { id: props.ecommerceMallAdmins.id } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
      order: { connect: { id: props.ecommerceMallOrders.id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
    } satisfies Prisma.ecommerce_mall_order_overridesCreateInput;
  }
}
