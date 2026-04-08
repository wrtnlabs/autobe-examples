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
    customer: IEntity;
    seller: IEntity;
    orderItem: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.orderItem.id } },
      customer: { connect: { id: props.customer.id } },
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
  }
}
