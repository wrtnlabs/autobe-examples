import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditCloneReportAtSummaryTransformer } from "./RedditCloneReportAtSummaryTransformer";

export namespace RedditCloneReportSnapshotTransformer {
  export type Payload = Prisma.reddit_clone_reports_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        target_type: true,
        target_id: true,
        captured_at: true,
        report: RedditCloneReportAtSummaryTransformer.select(),
        reporter: RedditCloneMemberAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_reports_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneReportSnapshot> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      target_type: input.target_type,
      target_id: input.target_id,
      captured_at: toISOStringSafe(input.captured_at),
      report: await RedditCloneReportAtSummaryTransformer.transform(
        input.report,
      ),
      reporter: await RedditCloneMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
