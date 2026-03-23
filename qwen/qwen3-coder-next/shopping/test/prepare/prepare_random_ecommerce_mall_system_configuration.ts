import { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_system_configuration(
  input?: DeepPartial<IEcommerceMallSystemConfiguration.ICreate> | undefined,
): IEcommerceMallSystemConfiguration.ICreate {
  return {
    key: input?.key ?? RandomGenerator.alphaNumeric(16),
    value:
      input?.value ??
      `{\"enabled\": ${typia.random<boolean>()}, \"config\": \"${RandomGenerator.paragraph({ sentences: 2 })}\"}`,
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
