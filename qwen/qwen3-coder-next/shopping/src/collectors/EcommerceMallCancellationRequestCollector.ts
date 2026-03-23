import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCancellationRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallCancellationRequest.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: props.body.status,
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.body.order_item_id } },
      customer: { connect: { id: props.body.customer_id } },
      seller: { connect: { id: props.body.seller_id } },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
  }
}
