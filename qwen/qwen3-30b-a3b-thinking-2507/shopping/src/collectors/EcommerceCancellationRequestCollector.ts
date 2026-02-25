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
    ecommerceOrderItems: IEntity;
  }) {
    const id = v4();
    return {
      id,
      reason: props.body.reason ?? null,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.ecommerceOrderItems.id } },
    } satisfies Prisma.ecommerce_cancellation_requestsCreateInput;
  }
}
