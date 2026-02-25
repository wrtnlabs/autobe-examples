import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSystemReferenceDataAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_system_reference_dataGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        value: true,
        label: true,
        description: true,
        sort_order: true,
        is_active: true,
        cacheInvalidationLogs: true,
      },
    } satisfies Prisma.shopping_mall_system_reference_dataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemReferenceData.ISummary> {
    return {
      id: input.id,
      name: input.name,
      value: input.value,
      label: input.label,
      description: input.description ?? undefined,
      sort_order: input.sort_order ?? undefined,
      is_active: input.is_active,
    };
  }
}
