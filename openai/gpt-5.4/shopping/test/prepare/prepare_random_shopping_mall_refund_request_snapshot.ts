import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_refund_request_snapshot(
  input?: DeepPartial<IShoppingMallRefundRequestSnapshot.ICreate>,
): IShoppingMallRefundRequestSnapshot.ICreate {
  return {
    status:
      input?.status ??
      RandomGenerator.pick([
        "approved",
        "rejected",
        "under_review",
        "cancelled",
      ] as const),
    review_note:
      input?.review_note ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
  };
}
