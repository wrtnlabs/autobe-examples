import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_cancellation_request_snapshot(
  input?:
    | DeepPartial<IShoppingMallCancellationRequestSnapshot.ICreate>
    | undefined,
): IShoppingMallCancellationRequestSnapshot.ICreate {
  input;
  return {};
}
