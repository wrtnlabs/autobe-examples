import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberReportsReportIdDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  // Query report with relations needed for transformer
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      include: {
        reporter: {
          include: {
            userAvatarFiles: true,
            karma: true,
          },
        },
        community: {
          include: {
            owner: {
              include: {
                userAvatarFiles: true,
                karma: true,
              },
            },
            icon: true,
          },
        },
      },
    });
  // Verify report is pending (cannot dismiss already resolved reports)
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  // Verify member is moderator of the community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_moderator_id: props.member.id,
        community: {
          id: report.community_id,
        },
      },
    },
  );
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Update report to dismissed status
  const updated = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: new Date(),
    },
    ...RedditCommunityReportTransformer.select(),
  });
  return await RedditCommunityReportTransformer.transform(updated);
}
