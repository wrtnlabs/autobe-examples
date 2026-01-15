import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExport";
import { IShoppingMallDataExportFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExportFilters";
export function prepare_random_shopping_mall_data_export(
  input?: DeepPartial<IShoppingMallDataExport.ICreate> | undefined,
): IShoppingMallDataExport.ICreate {
  return {
    entityType:
      input?.entityType ??
      RandomGenerator.pick([
        "customers",
        "orders",
        "products",
        "sales",
        "reviews",
        "sellers",
      ] as const),
    format:
      input?.format ?? RandomGenerator.pick(["csv", "json", "excel"] as const),
    filters: input?.filters ?? typia.random<number & tags.Type<"int32">>(),
    emailNotification:
      input?.emailNotification ?? RandomGenerator.pick([true, false] as const),
    maxSize:
      input?.maxSize ??
      typia.random<
        number &
          tags.Type<"uint32"> &
          tags.Default<52428800> &
          tags.Minimum<1> &
          tags.Maximum<104857600>
      >(),
    includeHeaders:
      input?.includeHeaders ?? RandomGenerator.pick([true, false] as const),
    includeTimestamps:
      input?.includeTimestamps ?? RandomGenerator.pick([true, false] as const),
    consolidateRelatedEntities:
      input?.consolidateRelatedEntities ??
      RandomGenerator.pick([true, false] as const),
    exportAsZip:
      input?.exportAsZip ?? RandomGenerator.pick([true, false] as const),
    dataType:
      input?.dataType ??
      RandomGenerator.pick(["full", "summary", "analytics", "audit"] as const),
    ignorePermissionScoping:
      input?.ignorePermissionScoping ??
      RandomGenerator.pick([true, false] as const),
    batchSize:
      input?.batchSize ??
      typia.random<
        number &
          tags.Type<"uint32"> &
          tags.Default<1000> &
          tags.Minimum<100> &
          tags.Maximum<10000>
      >(),
  };
}
