import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<{
    select: {
      id: true;
      reported_content_type: true;
      reported_content_id: true;
      reason: true;
      status: true;
      created_at: true;
      updated_at: true;
      reporter: {
        select: {
          username: true;
        };
      };
      community: {
        select: {
          name: true;
        };
      };
      resolvedBy: true;
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        reported_content_type: true,
        reported_content_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        reporter: {
          select: {
            username: true,
          },
        },
        community: {
          select: {
            name: true,
          },
        },
        resolvedBy: true,
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReport.ISummary> {
    return {
      id: input.id,
      reporter_username: input.reporter.username,
      community_name: input.community.name,
      reported_content_type: input.reported_content_type,
      reported_content_id: input.reported_content_id,
      reason: input.reason,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      resolved_at: input.resolvedBy?.id
        ? toISOStringSafe(input.updated_at)
        : null,
    } satisfies IRedditPlatformReport.ISummary;
  }
}
