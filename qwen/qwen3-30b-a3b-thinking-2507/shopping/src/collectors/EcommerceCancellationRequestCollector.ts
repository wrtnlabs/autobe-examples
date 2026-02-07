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
    ecommerceOrders: IEntity;
    ecommerceCustomers: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.ecommerceOrders.id } },
      customer: { connect: { id: props.ecommerceCustomers.id } },
    } satisfies Prisma.ecommerce_cancellation_requestsCreateInput;
  }
}
