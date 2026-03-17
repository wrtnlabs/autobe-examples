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
    recipientName: input?.recipientName ?? RandomGenerator.name(),
    recipientPhone: input?.recipientPhone ?? RandomGenerator.mobile(),
    streetAddress:
      input?.streetAddress ?? RandomGenerator.paragraph({ sentences: 2 }),
    city: input?.city ?? RandomGenerator.name(1),
    state: input?.state !== undefined ? input.state : RandomGenerator.name(1),
    postalCode: input?.postalCode ?? RandomGenerator.alphaNumeric(6),
    country: input?.country ?? RandomGenerator.name(1),
  };
}
