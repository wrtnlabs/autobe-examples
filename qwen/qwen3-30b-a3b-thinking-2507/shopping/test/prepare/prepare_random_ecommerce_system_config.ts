import { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_system_config(
  input?: DeepPartial<IEcommerceSystemConfig.ICreate>,
): IEcommerceSystemConfig.ICreate {
  return {
    key: input?.key ?? RandomGenerator.alphabets(8),
    value: input?.value ?? RandomGenerator.content(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
