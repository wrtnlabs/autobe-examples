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
    ecommerceOrderItems: IEntity;
    ecommerceCustomers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.ecommerceOrderItems.id } },
      customer: { connect: { id: props.ecommerceCustomers.id } },
    } satisfies Prisma.ecommerce_refund_requestsCreateInput;
  }
}
