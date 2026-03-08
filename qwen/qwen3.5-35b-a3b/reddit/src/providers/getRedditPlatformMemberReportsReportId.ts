import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReport> {
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      ...RedditPlatformReportTransformer.select(),
    });
  const isCommunityModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community.id,
        user_id: props.member.id,
      },
    });
  const isAdmin = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: {
      id: props.member.id,
    },
  });
  if (isCommunityModerator === null && isAdmin === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditPlatformReportTransformer.transform(report);
}
