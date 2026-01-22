import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSecurityPolicy";
export function prepare_random_todo_app_security_policy(
  input?: DeepPartial<ITodoAppSecurityPolicy.ICreate>,
): ITodoAppSecurityPolicy.ICreate {
  return {
    key:
      input?.key ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<15>
        >(),
      ),
    value:
      input?.value ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      }),
    description:
      typeof input?.description === "undefined"
        ? RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
            >(),
          })
        : input?.description === null
          ? null
          : input?.description,
    active: input?.active ?? RandomGenerator.pick([true, false] as const),
  };
}
