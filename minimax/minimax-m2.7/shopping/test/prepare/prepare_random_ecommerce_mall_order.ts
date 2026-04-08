import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_order(
  input?: DeepPartial<IEcommerceMallOrder.ICreate>,
): IEcommerceMallOrder.ICreate {
  return {
    shippingAddressId:
      input?.shippingAddressId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
