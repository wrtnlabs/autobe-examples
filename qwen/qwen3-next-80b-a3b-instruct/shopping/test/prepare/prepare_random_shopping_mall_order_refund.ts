import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
export function prepare_random_shopping_mall_order_refund(
  input?: DeepPartial<IShoppingMallOrderRefund.ICreate>,
): IShoppingMallOrderRefund.ICreate {
  return {
    orderCode:
      input?.orderCode ??
      typia.random<string & tags.Pattern<"^ORD-2026-[0-9]{6}$">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    refund_amount:
      input?.refund_amount ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<999999>
      >(),
    refund_type:
      input?.refund_type ?? RandomGenerator.pick(["full", "partial"] as const),
    return_items:
      input?.return_items ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
    return_reason_code:
      input?.return_reason_code ??
      RandomGenerator.pick([
        "DAMAGED",
        "WRONG_ITEM",
        "NO_LONGER_NEEDED",
        "DUPLICATE_PAYMENT",
        "NOT_AS_DESCRIBED",
        "NOT_NEEDED",
      ] as const),
    return_ship_method:
      input?.return_ship_method ??
      RandomGenerator.pick([
        "USPS_Priority_Mail",
        "FedEx_2_Day",
        "Standard_Return_Courier",
        "UPS_Color_Priority",
        "DHL_Express",
        "Amazon_Return",
      ] as const),
  };
}
