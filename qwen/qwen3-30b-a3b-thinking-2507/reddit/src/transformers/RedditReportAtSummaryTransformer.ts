import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: {
          select: {
            username: true,
          },
        },
        moderationLogs: true,
        resolutions: true,
      },
    } satisfies Prisma.reddit_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditReport.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "dismissed">(input.status),
      createdAt: toISOStringSafe(input.created_at),
      reporterUsername: input.reporter.username ?? "",
    };
  }
}
