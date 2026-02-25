import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneContentReportTransformer } from "../transformers/RedditCloneContentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string;
}): Promise<IRedditCloneContentReport> {
  const report =
    await MyGlobal.prisma.reddit_clone_content_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCloneContentReportTransformer.select(),
    });
  const updated = await MyGlobal.prisma.reddit_clone_content_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      report_resolved_by_moderator_id: props.moderator.id,
      updated_at: new Date(),
    },
    ...RedditCloneContentReportTransformer.select(),
  });
  const transformed =
    await RedditCloneContentReportTransformer.transform(updated);
  return transformed;
}
