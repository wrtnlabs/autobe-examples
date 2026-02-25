import { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_metadata_registry(
  input?: DeepPartial<IEcommerceMetadataRegistry.ICreate>,
): IEcommerceMetadataRegistry.ICreate {
  return {
    schema_name: input?.schema_name ?? RandomGenerator.alphabets(10),
    schema_version:
      input?.schema_version ??
      typia.random<string & tags.Pattern<"^[0-9]+\\.[0-9]+\\.[0-9]+$">>(),
    description:
      input?.description ??
      RandomGenerator.pick([null, RandomGenerator.paragraph({ sentences: 3 })]),
    is_active: input?.is_active ?? true,
  };
}
