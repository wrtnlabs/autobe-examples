import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformReportAtSummaryTransformer } from "./RedditPlatformReportAtSummaryTransformer";

export namespace RedditPlatformReportSnapshotTransformer {
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
        reporter_id: true,
        community_id: true,
        resolved_by: true,
        report: RedditPlatformReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReportSnapshot> {
    return {
      id: input.id,
      reported_content_type: input.reported_content_type,
      reported_content_id: input.reported_content_id,
      reason: input.reason,
      status: input.status,
      resolved_at: input.resolved_at
        ? toISOStringSafe(input.resolved_at)
        : null,
      snapshot_created_at: toISOStringSafe(input.snapshot_created_at),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      reddit_platform_report_id: input.report.reddit_platform_report_id,
      reporter: {
        id: input.reporter_id,
        username: "",
        display_name: "",
        karma_score: 0,
        is_active: true,
        created_at: toISOStringSafe(input.created_at),
      } satisfies IRedditPlatformMember.ISummary,
      community: {
        id: input.community_id,
        name: "",
        subscriber_count: 0,
        created_at: toISOStringSafe(input.created_at),
        owner: {
          id: "",
          username: "",
          display_name: "",
          karma_score: 0,
          is_active: true,
          created_at: toISOStringSafe(input.created_at),
        } satisfies IRedditPlatformMember.ISummary,
      } satisfies IRedditPlatformCommunity.ISummary,
      resolvedBy: input.resolved_by
        ? ({
            id: input.resolved_by,
            username: "",
            display_name: "",
            karma_score: 0,
            is_active: true,
            created_at: toISOStringSafe(input.created_at),
          } satisfies IRedditPlatformMember.ISummary)
        : null,
      report: await RedditPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
    } satisfies IRedditPlatformReportSnapshot;
  }
}
