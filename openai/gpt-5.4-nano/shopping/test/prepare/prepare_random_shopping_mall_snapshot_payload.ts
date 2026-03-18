import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_snapshot_payload(
  input?: DeepPartial<IShoppingMallSnapshotPayload.ICreate> | undefined,
): IShoppingMallSnapshotPayload.ICreate {
  return {
    payload: input?.payload ?? RandomGenerator.content({ paragraphs: 2 }),
  };
}
