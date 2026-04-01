import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallProductSnapshot.ICreate;
  }) {
    return {
      id: v4(),
      snapshot_code: props.body.snapshot_code,
      source_type: props.body.source_type,
      source_entity_id: props.body.source_entity_id,
      source_seller_id: props.body.source_seller_id ?? null,
      source_order_id: props.body.source_order_id ?? null,
      source_order_item_id: props.body.source_order_item_id ?? null,
      source_review_id: props.body.source_review_id ?? null,
      source_cancellation_request_id:
        props.body.source_cancellation_request_id ?? null,
      source_refund_request_id: props.body.source_refund_request_id ?? null,
      created_by_member_id: null,
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
