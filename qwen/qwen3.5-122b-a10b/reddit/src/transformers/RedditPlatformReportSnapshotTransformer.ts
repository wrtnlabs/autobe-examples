import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformReportAtSummaryTransformer } from "./RedditPlatformReportAtSummaryTransformer";

export namespace RedditPlatformReportSnapshotTransformer {
  export type Payload = Prisma.reddit_platform_report_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        report: RedditPlatformReportAtSummaryTransformer.select(),
        moderator: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_report_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReportSnapshot> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      report: await RedditPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
      moderator: input.moderator
        ? await RedditPlatformMemberAtSummaryTransformer.transform(
            input.moderator,
          )
        : null,
    };
  }
}
