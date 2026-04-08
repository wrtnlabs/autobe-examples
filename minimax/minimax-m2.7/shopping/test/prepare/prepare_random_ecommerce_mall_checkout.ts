import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_checkout(
  input?: DeepPartial<IEcommerceMallCheckout.ICreate>,
): IEcommerceMallCheckout.ICreate {
  return {
    shippingAddressId:
      input?.shippingAddressId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
