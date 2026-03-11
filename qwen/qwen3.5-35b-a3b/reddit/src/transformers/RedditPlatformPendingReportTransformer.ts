import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPendingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPendingReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPendingReportTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: {
          select: { username: true, id: true },
        },
        community: {
          select: { name: true, id: true },
        },
        resolvedBy: {
          select: { id: true },
        },
        snapshots: true,
        viewHistories: true,
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPendingReport> {
    const now = new Date();
    const created = new Date(input.created_at);
    const elapsedMs = now.getTime() - created.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    const elapsedDays = Math.floor(elapsedHours / 24);
    let timeElapsed: string;
    if (elapsedDays > 0) {
      timeElapsed = `${elapsedDays} day${elapsedDays > 1 ? "s" : ""} ago`;
    } else if (elapsedHours > 0) {
      timeElapsed = `${elapsedHours} hour${elapsedHours > 1 ? "s" : ""} ago`;
    } else if (elapsedMinutes > 0) {
      timeElapsed = `${elapsedMinutes} minute${elapsedMinutes > 1 ? "s" : ""} ago`;
    } else {
      timeElapsed = "Just now";
    }
    const contentTitle = input.reported_content_type === "POST" ? null : null;
    const contentPreview =
      input.reported_content_type === "COMMENT" ? null : null;
    return {
      id: input.id,
      status: typia.assert<"pending" | "resolved" | "dismissed">(input.status),
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      reporter_id: typia.assert<string>(input.reporter.id),
      reporter_username: input.reporter.username,
      community_id: typia.assert<string>(input.community.id),
      community_name: input.community.name,
      reported_content_type: typia.assert<"POST" | "COMMENT">(
        input.reported_content_type,
      ),
      content_title: contentTitle,
      content_preview: contentPreview,
      time_elapsed: timeElapsed,
    };
  }
}
