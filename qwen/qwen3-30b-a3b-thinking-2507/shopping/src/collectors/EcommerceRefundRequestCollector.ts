import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceRefundRequestCollector {
  export async function collect(props: {
    body: IEcommerceRefundRequest.ICreate;
    ecommerceOrders: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending",
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.ecommerceOrders.id } },
    } satisfies Prisma.ecommerce_refund_requestsCreateInput;
  }
}
