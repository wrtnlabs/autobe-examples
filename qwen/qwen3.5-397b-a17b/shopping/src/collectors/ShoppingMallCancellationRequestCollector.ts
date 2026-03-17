import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCancellationRequestCollector {
  export async function collect(props: {
    body: IShoppingMallCancellationRequest.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "PENDING",
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      orderItem: { connect: { id: props.body.order_item_id } },
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      respondedSeller: undefined,
      // HasMany relations
      snapshots: undefined,
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
