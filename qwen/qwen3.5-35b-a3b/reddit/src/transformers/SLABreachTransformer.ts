import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace SLABreachTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reporter: true,
        community: true,
        resolvedBy: true,
        reported_content_type: true,
        reported_content_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshots: true,
        viewHistories: true,
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ISLABreach> {
    const isFinalStatus =
      input.status === "RESOLVED" || input.status === "DISMISSED";
    const resolvedAt: string | null = isFinalStatus
      ? toISOStringSafe(input.updated_at)
      : null;
    const hoursOverSla: number =
      isFinalStatus && input.updated_at
        ? (() => {
            const created = input.created_at;
            const resolved = input.updated_at;
            const hoursDiff =
              (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
            return Math.max(0, hoursDiff - 24);
          })()
        : 0;
    return {
      report_id: input.id,
      community_id: input.community.id,
      reported_type: typia.assert<"POST" | "COMMENT">(
        input.reported_content_type,
      ),
      reported_content_id: input.reported_content_id,
      created_at: toISOStringSafe(input.created_at),
      resolved_at: resolvedAt,
      hours_over_sla: hoursOverSla,
    };
  }
}
