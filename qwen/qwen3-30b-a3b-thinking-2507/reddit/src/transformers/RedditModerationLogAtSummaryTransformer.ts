import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditModerationLog";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditProfileAtSummaryTransformer } from "./RedditProfileAtSummaryTransformer";
import { RedditReportAtSummaryTransformer } from "./RedditReportAtSummaryTransformer";

export namespace RedditModerationLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        result: true,
        details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: RedditProfileAtSummaryTransformer.select(),
        report: {
          select: {
            id: true,
            reason: true,
            status: true,
            created_at: true,
            reporter: {
              select: {
                username: true,
              },
            },
            moderationLogs: true,
            resolutions: true,
          },
        },
      },
    } satisfies Prisma.reddit_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditModerationLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      reason: input.reason ?? undefined,
      result: input.result,
      created_at: toISOStringSafe(input.created_at),
      moderator: await RedditProfileAtSummaryTransformer.transform(
        input.moderator,
      ),
      report: await RedditReportAtSummaryTransformer.transform(input.report),
    };
  }
}
