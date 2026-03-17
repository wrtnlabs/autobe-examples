import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ISearchHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthMetric";
import { ISearchHealthStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthStatus";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace SearchHealthStatusTransformer {
  export type Item = Prisma.ecommerce_mall_search_indicesGetPayload<
    ReturnType<typeof select>
  >;
  export type Payload = Item[];
  export function select() {
    return {
      select: {
        id: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_search_indicesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ISearchHealthStatus> {
    const lastUpdated =
      input.length > 0
        ? toISOStringSafe(
            new Date(
              Math.max(...input.map((item: Item) => item.updated_at.getTime())),
            ),
          )
        : toISOStringSafe(new Date(0));
    const totalIndexedCount = input.filter(
      (item: Item) => !item.deleted_at,
    ).length;
    const freshnessHours = lastUpdated
      ? Math.floor(
          (new Date().getTime() - new Date(lastUpdated).getTime()) /
            (1000 * 60 * 60),
        )
      : null;
    const status: "healthy" | "degraded" | "unhealthy" =
      !lastUpdated || freshnessHours === null || freshnessHours > 24
        ? "unhealthy"
        : freshnessHours < 1
          ? "healthy"
          : "degraded";
    return {
      status,
      lastUpdated,
      metrics: {
        totalIndexedCount,
        availabilityStatus: "available",
        freshnessHours,
      } satisfies ISearchHealthMetric,
    };
  }
}
