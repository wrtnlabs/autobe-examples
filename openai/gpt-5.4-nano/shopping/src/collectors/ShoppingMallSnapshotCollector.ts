import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallSnapshot.ICreate;
  }) {
    return {
      id: v4(),
      snapshot_code: props.body.snapshot_code,
      source_type: props.body.source_type,
      source_entity_id: props.body.source_entity_id,
      source_seller_id:
        props.body.source_seller_id === undefined
          ? undefined
          : props.body.source_seller_id,
      source_order_id:
        props.body.source_order_id === undefined
          ? undefined
          : props.body.source_order_id,
      source_order_item_id:
        props.body.source_order_item_id === undefined
          ? undefined
          : props.body.source_order_item_id,
      source_review_id:
        props.body.source_review_id === undefined
          ? undefined
          : props.body.source_review_id,
      source_cancellation_request_id:
        props.body.source_cancellation_request_id === undefined
          ? undefined
          : props.body.source_cancellation_request_id,
      source_refund_request_id:
        props.body.source_refund_request_id === undefined
          ? undefined
          : props.body.source_refund_request_id,
      created_by_member_id:
        props.body.created_by_member_id === undefined
          ? undefined
          : props.body.created_by_member_id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      snapshotParties: undefined,
      payload: undefined,
      sellerSnapshotOrderItems: undefined,
    } satisfies Prisma.shopping_mall_snapshotsCreateInput;
  }
}
