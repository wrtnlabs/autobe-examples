import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallRefundRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallRefundRequest.ICreate;
    ecommerceMallOrderItems: IEntity;
    ecommerceMallCustomers: IEntity;
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
    } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
  }
}
