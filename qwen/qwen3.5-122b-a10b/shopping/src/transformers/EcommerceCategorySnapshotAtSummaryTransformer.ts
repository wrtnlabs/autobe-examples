import { IEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCategorySnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_category_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCategorySnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parent_category_id: input.parent_category_id ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceCategorySnapshot.ISummary;
  }
}
