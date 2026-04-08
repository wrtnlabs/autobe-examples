import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallRefundRequestCollector {
  export async function collect(props: {
    body: IShoppingMallRefundRequest.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "pending",
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.member.id } },
      orderItem: { connect: { id: props.body.order_item_id } },
      // HasMany relations - not creating snapshots on initial create
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
