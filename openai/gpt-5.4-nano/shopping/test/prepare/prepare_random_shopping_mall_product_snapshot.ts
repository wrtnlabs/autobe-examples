import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_snapshot(
  input?: DeepPartial<IShoppingMallProductSnapshot.ICreate> | undefined,
): IShoppingMallProductSnapshot.ICreate {
  return {
    snapshot_code:
      input?.snapshot_code ?? `snap_${RandomGenerator.alphaNumeric(18)}`,
    source_type:
      input?.source_type ??
      RandomGenerator.pick([
        "seller",
        "order",
        "order_item",
        "review",
        "cancellation",
        "refund",
      ] as const),
    source_entity_id:
      input?.source_entity_id ?? typia.random<string & tags.Format<"uuid">>(),
    source_seller_id:
      input?.source_seller_id === undefined
        ? Math.random() < 0.7
          ? typia.random<string & tags.Format<"uuid">>()
          : null
        : input.source_seller_id,
    source_order_id:
      input?.source_order_id === undefined
        ? Math.random() < 0.7
          ? typia.random<string & tags.Format<"uuid">>()
          : null
        : input.source_order_id,
    source_order_item_id:
      input?.source_order_item_id === undefined
        ? Math.random() < 0.7
          ? typia.random<string & tags.Format<"uuid">>()
          : null
        : input.source_order_item_id,
    source_review_id:
      input?.source_review_id === undefined
        ? Math.random() < 0.7
          ? typia.random<string & tags.Format<"uuid">>()
          : null
        : input.source_review_id,
    source_cancellation_request_id:
      input?.source_cancellation_request_id === undefined
        ? Math.random() < 0.7
          ? typia.random<string & tags.Format<"uuid">>()
          : null
        : input.source_cancellation_request_id,
    source_refund_request_id:
      input?.source_refund_request_id === undefined
        ? Math.random() < 0.7
          ? typia.random<string & tags.Format<"uuid">>()
          : null
        : input.source_refund_request_id,
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
        wordMin: 3,
        wordMax: 9,
      }),
  };
}
