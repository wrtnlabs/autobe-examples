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
    refundRequest: IEntity;
    reviewer?: IEntity;
  }) {
    return {
      id: v4(),
      reviewer_actor_id: props.reviewer?.id ?? null,
      refundRequest: {
        connect: {
          id: props.refundRequest.id,
        },
      },
    } satisfies Prisma.shopping_mall_refund_request_snapshotsCreateInput;
  }
}
