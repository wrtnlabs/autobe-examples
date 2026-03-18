import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSnapshotPartyCollector {
  export async function collect(props: {
    body: IShoppingMallSnapshotParty.ICreate;
    snapshot: IEntity;
  }) {
    return {
      id: v4(),
      party_type: props.body.partyType,
      party_id: props.body.partyId,
      can_view: props.body.canView,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      snapshot: { connect: { id: props.snapshot.id } },
    } satisfies Prisma.shopping_mall_snapshot_partiesCreateInput;
  }
}
