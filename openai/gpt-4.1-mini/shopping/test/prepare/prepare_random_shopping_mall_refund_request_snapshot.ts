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
    shoppingMallRefundRequestId:
      input?.shoppingMallRefundRequestId ??
      typia.random<string & tags.Format<"uuid">>(),
    status: input?.status ?? RandomGenerator.alphabets(10),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    comment: input?.comment ?? null,
    createdAt:
      input?.createdAt ?? typia.random<string & tags.Format<"date-time">>(),
    updatedAt:
      input?.updatedAt ?? typia.random<string & tags.Format<"date-time">>(),
    deletedAt: input?.deletedAt ?? null,
  };
}
