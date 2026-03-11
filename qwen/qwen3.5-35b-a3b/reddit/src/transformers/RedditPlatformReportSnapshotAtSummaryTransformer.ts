import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformReportSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_report_snapshotsGetPayload<
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
        resolved_at: true,
        snapshot_created_at: true,
        created_at: true,
        updated_at: true,
        report: {
          select: {
            reporter: RedditPlatformMemberAtSummaryTransformer.select(),
            community: RedditPlatformCommunityAtSummaryTransformer.select(),
            resolvedBy: RedditPlatformMemberAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.reddit_platform_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReportSnapshot.ISummary> {
    return {
      id: input.id,
      reporter: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.report.reporter,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.report.community,
      ),
      reported_content_type: input.reported_content_type,
      reported_content_id: input.reported_content_id,
      reason: input.reason,
      status: input.status,
      resolved_by: input.report.resolvedBy
        ? await RedditPlatformMemberAtSummaryTransformer.transform(
            input.report.resolvedBy,
          )
        : null,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IRedditPlatformReportSnapshot.ISummary;
  }
}
