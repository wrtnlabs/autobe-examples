import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformAdminAtSummaryTransformer } from "./RedditPlatformAdminAtSummaryTransformer";
import { RedditPlatformReportAtSummaryTransformer } from "./RedditPlatformReportAtSummaryTransformer";

export namespace RedditPlatformReportViewTransformer {
  export type Payload = Prisma.reddit_platform_report_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        viewed_at: true,
        created_at: true,
        updated_at: true,
        moderator: RedditPlatformAdminAtSummaryTransformer.select(),
        report: RedditPlatformReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_report_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReportView> {
    return {
      id: input.id,
      viewed_at: input.viewed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      moderator: await RedditPlatformAdminAtSummaryTransformer.transform(
        input.moderator,
      ),
      report: await RedditPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
    };
  }
}
