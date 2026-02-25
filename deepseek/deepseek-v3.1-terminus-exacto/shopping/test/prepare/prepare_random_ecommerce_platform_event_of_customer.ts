import { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_platform_event_of_customer(
  input?: DeepPartial<IEcommercePlatformEventOfCustomer.ICreate> | undefined,
): IEcommercePlatformEventOfCustomer.ICreate {
  return {
    rule_code: input?.rule_code ?? typia.random<string & tags.Format<"uuid">>(),
    rule_name: input?.rule_name ?? RandomGenerator.paragraph({ sentences: 3 }),
    rule_description:
      input?.rule_description ?? RandomGenerator.content({ paragraphs: 2 }),
    rule_type:
      input?.rule_type ??
      RandomGenerator.pick([
        "validation",
        "workflow",
        "calculation",
        "restriction",
        "notification",
        "pricing",
        "inventory",
        "shipping",
        "discount",
        "tax",
      ] as const),
    configuration_json:
      input?.configuration_json ??
      JSON.stringify({
        enabled: typia.random<boolean>(),
        threshold: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
        >(),
        message: RandomGenerator.paragraph({ sentences: 1 }),
        rules: ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            id: RandomGenerator.alphabets(5),
            condition: RandomGenerator.content({ paragraphs: 1 }),
            action: RandomGenerator.pick([
              "allow",
              "deny",
              "modify",
              "notify",
            ] as const),
          }),
        ),
      }),
    is_active: input?.is_active ?? true,
    execution_order:
      input?.execution_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    version:
      input?.version ??
      `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<99>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<999>>()}`,
  };
}
