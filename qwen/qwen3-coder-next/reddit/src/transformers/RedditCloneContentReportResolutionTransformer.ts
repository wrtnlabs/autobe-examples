import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentReportResolutionTransformer {
  export type Payload =
    Prisma.reddit_clone_content_report_resolutionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        report: {
          select: {
            id: true,
          },
        },
        moderator: {
          select: {
            id: true,
          },
        },
        action: true,
        reason: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.reddit_clone_content_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentReportResolution> {
    return {
      id: input.id,
      reportId: input.report.id,
      moderatorId: input.moderator.id,
      action: input.action,
      reason: input.reason ?? null,
      resolvedAt: toISOStringSafe(input.resolved_at),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
