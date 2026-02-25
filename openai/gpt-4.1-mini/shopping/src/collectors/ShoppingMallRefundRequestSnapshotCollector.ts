import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallRefundRequestSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallRefundRequestSnapshot.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      status: props.body.status,
      reason: props.body.reason,
      comment: props.body.comment ?? null,
      created_at: new Date(props.body.createdAt),
      updated_at: new Date(props.body.updatedAt),
      deleted_at: props.body.deletedAt ? new Date(props.body.deletedAt) : null,
      refundRequest: {
        connect: { id: props.body.shoppingMallRefundRequestId },
      },
    } satisfies Prisma.shopping_mall_refund_request_snapshotsCreateInput;
  }
}
