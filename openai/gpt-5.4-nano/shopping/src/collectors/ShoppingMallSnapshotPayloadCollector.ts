import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSnapshotPayloadCollector {
  export async function collect(props: {
    body: IShoppingMallSnapshotPayload.ICreate;
    snapshotMallSnapshots: IEntity;
  }) {
    return {
      id: v4(),
      payload: props.body.payload,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      snapshot: { connect: { id: props.snapshotMallSnapshots.id } },
    } satisfies Prisma.shopping_mall_snapshot_payloadsCreateInput;
  }
}
