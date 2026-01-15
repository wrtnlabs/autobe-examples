import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderReturn";
import { ICommunityPlatformOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderReturnItem";
export function prepare_random_community_platform_order_return(
  input?: DeepPartial<ICommunityPlatformOrderReturn.ICreate>,
): ICommunityPlatformOrderReturn.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      }),
    condition:
      input?.condition ??
      RandomGenerator.pick([
        "new",
        "used",
        "damaged",
        "defective",
        "wrong item received",
        "changed mind",
      ] as const),
    selected_items: input?.selected_items
      ? input.selected_items.map((item) => ({
          order_item_id:
            item.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
          quantity:
            item.quantity ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            order_item_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          }),
        ),
  };
}
