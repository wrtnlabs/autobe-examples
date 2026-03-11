import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformReportAnalyticAtCommunityBreakdownTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
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
        deleted_at: true,
        reporter: {
          select: {
            id: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
          },
        },
        snapshots: {
          select: {
            id: true,
          },
        },
        viewHistories: {
          select: {
            id: true,
          },
        },
      },
      where: {
        deleted_at: null,
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReportAnalytic.ICommunityBreakdown> {
    return {
      communityId: input.community.id,
      communityName: input.community.name,
      reportCount: 1,
      pendingCount: input.status === "PENDING" ? 1 : 0,
    };
  }
}
