import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_snapshot(
  input?: DeepPartial<IShoppingMallSnapshot.ICreate> | undefined,
): IShoppingMallSnapshot.ICreate {
  return {
    snapshot_code:
      input?.snapshot_code ??
      `SM-${RandomGenerator.alphabets(6)}-${RandomGenerator.alphaNumeric(4)}`,
    source_type:
      input?.source_type ??
      RandomGenerator.pick([
        "product",
        "product_variant",
        "order_item",
        "review",
        "cancellation_request",
        "refund_request",
      ] as const),
    source_entity_id:
      input?.source_entity_id ?? typia.random<string & tags.Format<"uuid">>(),
    source_seller_id:
      input?.source_seller_id !== undefined ? input.source_seller_id : null,
    source_order_id:
      input?.source_order_id !== undefined ? input.source_order_id : null,
    source_order_item_id:
      input?.source_order_item_id !== undefined
        ? input.source_order_item_id
        : null,
    source_review_id:
      input?.source_review_id !== undefined ? input.source_review_id : null,
    source_cancellation_request_id:
      input?.source_cancellation_request_id !== undefined
        ? input.source_cancellation_request_id
        : null,
    source_refund_request_id:
      input?.source_refund_request_id !== undefined
        ? input.source_refund_request_id
        : null,
    created_by_member_id:
      input?.created_by_member_id !== undefined
        ? input.created_by_member_id
        : null,
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
