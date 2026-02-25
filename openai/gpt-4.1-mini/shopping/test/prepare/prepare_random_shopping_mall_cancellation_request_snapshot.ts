import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_cancellation_request_snapshot(
  input?: DeepPartial<IShoppingMallCancellationRequestSnapshot.ICreate>,
): IShoppingMallCancellationRequestSnapshot.ICreate {
  return {
    cancellation_request_id:
      input?.cancellation_request_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
    status:
      input?.status ??
      RandomGenerator.pick(["pending", "approved", "rejected"]),
    created_at:
      input?.created_at ?? typia.random<string & tags.Format<"date-time">>(),
    updated_at:
      input?.updated_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
