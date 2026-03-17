import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_address(
  input?: DeepPartial<IEcommerceMallAddress.ICreate>,
): IEcommerceMallAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    recipient_phone: input?.recipient_phone ?? RandomGenerator.mobile(),
    street: input?.street ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.paragraph({ sentences: 1 }),
    state: input?.state ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
