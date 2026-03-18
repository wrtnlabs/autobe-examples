import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_snapshot_party(
  input?: DeepPartial<IShoppingMallSnapshotParty.ICreate> | undefined,
): IShoppingMallSnapshotParty.ICreate {
  return {
    partyType: input?.partyType ?? RandomGenerator.alphabets(10),
    partyId: input?.partyId ?? typia.random<string & tags.Format<"uuid">>(),
    canView: input?.canView ?? typia.random<boolean>(),
  };
}
