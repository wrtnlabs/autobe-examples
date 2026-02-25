import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { IRedditReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";
import { RedditReportAtSummaryTransformer } from "./RedditReportAtSummaryTransformer";

export namespace RedditReportResolutionAtSummaryTransformer {
  export type Payload = Prisma.reddit_report_resolutionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        resolution_type: true,
        dismissal_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: {
          select: {
            id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            reporter: {
              select: {
                profile: {
                  select: {
                    username: true,
                  },
                },
              },
            },
            moderationLogs: true,
            resolutions: true,
          },
        } satisfies Prisma.reddit_reportsFindManyArgs,
        moderator: RedditMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditReportResolution.ISummary> {
    return {
      id: input.id,
      resolution_type: typia.assert<"approve" | "dismiss">(
        input.resolution_type,
      ),
      dismissal_reason: input.dismissal_reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      report: await RedditReportAtSummaryTransformer.transform(input.report),
      moderator: await RedditMemberAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
