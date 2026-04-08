import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_seller_suspension(
  input?: DeepPartial<IEcommerceMallSellerSuspension.ICreate>,
): IEcommerceMallSellerSuspension.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    sellerId: input?.sellerId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
