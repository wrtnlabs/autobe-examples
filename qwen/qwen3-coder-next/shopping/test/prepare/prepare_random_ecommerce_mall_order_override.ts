import { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_order_override(
  input?: DeepPartial<IEcommerceMallOrderOverride.ICreate> | undefined,
): IEcommerceMallOrderOverride.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    action_type: input?.action_type ?? "cancel",
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
