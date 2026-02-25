import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceCancellationRequestCollector {
  export async function collect(props: {
    body: IEcommerceCancellationRequest.ICreate;
    ecommerceCustomers: IEntity; // from authorized actor
    ecommerceSellers: IEntity; // from path parameter sellerId
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceCustomers.id } },
      orderItem: { connect: { id: props.body.ecommerce_order_item_id } },
      seller: { connect: { id: props.ecommerceSellers.id } },
      snapshots: undefined,
      statusTransitions: undefined,
      responseRecord: undefined,
      inventoryRestorations: undefined,
    } satisfies Prisma.ecommerce_cancellation_requestsCreateInput;
  }
}
