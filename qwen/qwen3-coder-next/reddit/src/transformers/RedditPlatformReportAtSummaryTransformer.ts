import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        resolved_at: true,
        reported_type: true,
        reported_id: true,
        reason: true,
        status: true,
        reporter: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReport.ISummary> {
    return {
      id: input.id,
      reporter: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      reported_type: input.reported_type,
      reported_id: input.reported_id,
      reason: input.reason,
      status: input.status,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
