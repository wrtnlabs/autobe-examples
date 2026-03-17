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

export async function getRedditCommunityMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  // Verify moderator status against the report's community before returning data
  // First, get the report's community_id and check if member is a moderator
  const reportMeta = await MyGlobal.prisma.reddit_community_reports.findFirst({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (reportMeta === null) {
    // Report not found or soft deleted - let the next query handle this
  }
  // Verify the member is a moderator of the report's community
  const moderation =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community: {
          id: reportMeta!.community_id,
        },
        reddit_community_moderator_id: props.member.id,
      },
    });
  if (moderation === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Now that we've verified access, load the full report data
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
      },
      ...RedditCommunityReportTransformer.select(),
    });
  // Transform and return the report
  return await RedditCommunityReportTransformer.transform(report);
}
