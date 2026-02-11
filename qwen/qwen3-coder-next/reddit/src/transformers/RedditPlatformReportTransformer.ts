import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformAdminAtSummaryTransformer } from "./RedditPlatformAdminAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformReportTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reporter_id: true,
        resolved_by_id: true,
        reported_type: true,
        reported_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
        reporter: RedditPlatformMemberAtSummaryTransformer.select(),
        resolvedBy: RedditPlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReport> {
    return {
      id: input.id,
      reporterId: input.reporter_id,
      resolvedById: input.resolved_by_id ?? null,
      reportedType: input.reported_type as "POST" | "COMMENT",
      reportedId: input.reported_id,
      reason: input.reason,
      status: input.status as "PENDING" | "APPROVED" | "DISMISSED",
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      resolvedAt: input.resolved_at ? input.resolved_at.toISOString() : null,
      reporter: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      resolvedBy: input.resolvedBy
        ? await RedditPlatformAdminAtSummaryTransformer.transform(
            input.resolvedBy,
          )
        : null,
    };
  }
}
