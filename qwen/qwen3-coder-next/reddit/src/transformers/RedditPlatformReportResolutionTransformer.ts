import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformAdminAtSummaryTransformer } from "./RedditPlatformAdminAtSummaryTransformer";
import { RedditPlatformReportAtSummaryTransformer } from "./RedditPlatformReportAtSummaryTransformer";

export namespace RedditPlatformReportResolutionTransformer {
  export type Payload = Prisma.reddit_platform_report_resolutionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        resolution_notes: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        admin_id: true,
        report_id: true,
        admin: RedditPlatformAdminAtSummaryTransformer.select(),
        report: RedditPlatformReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReportResolution> {
    return {
      id: input.id,
      status: input.status,
      resolution_notes: input.resolution_notes ?? undefined,
      resolved_at: input.resolved_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      admin_id: input.admin_id,
      report_id: input.report_id,
      admin: await RedditPlatformAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      report: await RedditPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
    };
  }
}
