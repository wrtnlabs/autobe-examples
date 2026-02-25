import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditModerationLog";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditProfileAtSummaryTransformer } from "../transformers/RedditProfileAtSummaryTransformer";
import { RedditReportAtSummaryTransformer } from "../transformers/RedditReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditMemberModerationLogsLogId(props: {
  member: MemberPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditModerationLog> {
  const moderationLog =
    await MyGlobal.prisma.reddit_moderation_logs.findUniqueOrThrow({
      where: { id: props.logId },
      include: {
        report: {
          select: {
            id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            reporter: { select: { username: true } },
          },
        },
        moderator: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            avatar: true,
            karma: true,
            created_at: true,
            member: { select: { id: true, email: true } },
          },
        },
      },
    });
  return {
    id: moderationLog.id as string & tags.Format<"uuid">,
    action_type: moderationLog.action_type,
    reason: moderationLog.reason,
    result: moderationLog.result,
    details: moderationLog.details,
    created_at: moderationLog.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: moderationLog.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: moderationLog.deleted_at?.toISOString() ?? null,
    report: await RedditReportAtSummaryTransformer.transform(
      moderationLog.report,
    ),
    moderator: await RedditProfileAtSummaryTransformer.transform(
      moderationLog.moderator,
    ),
  } satisfies IRedditModerationLog;
}
