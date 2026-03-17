import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";
import { RedditCloneReportAtSummaryTransformer } from "./RedditCloneReportAtSummaryTransformer";

export namespace RedditCloneReportActionTransformer {
  export type Payload = Prisma.reddit_clone_report_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        created_at: true,
        report: RedditCloneReportAtSummaryTransformer.select(),
        moderator: RedditCloneModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_report_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneReportAction> {
    return {
      id: input.id,
      action: input.action as "APPROVE" | "DISMISS",
      created_at: input.created_at.toISOString(),
      report: await RedditCloneReportAtSummaryTransformer.transform(
        input.report,
      ),
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
