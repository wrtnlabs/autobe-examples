import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_system_version(
  input?: DeepPartial<IShoppingMallSystemVersion.ICreate> | undefined,
): IShoppingMallSystemVersion.ICreate {
  return {
    entity_name: input?.entity_name ?? RandomGenerator.name(1),
    entity_id: input?.entity_id ?? typia.random<string & tags.Format<"uuid">>(),
    version_number:
      input?.version_number ?? typia.random<number & tags.Type<"int32">>(),
    changed_fields:
      input?.changed_fields ??
      JSON.stringify([
        RandomGenerator.alphabets(5),
        RandomGenerator.alphabets(5),
      ]),
    change_description: input?.change_description ?? null,
    changed_by: input?.changed_by ?? null,
    created_at:
      input?.created_at ?? typia.random<string & tags.Format<"date-time">>(),
    updated_at:
      input?.updated_at ?? typia.random<string & tags.Format<"date-time">>(),
    deleted_at: input?.deleted_at ?? null,
  };
}
