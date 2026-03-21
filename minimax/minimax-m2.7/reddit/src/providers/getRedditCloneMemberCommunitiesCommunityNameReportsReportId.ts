import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberCommunitiesCommunityNameReportsReportId(props: {
  member: MemberPayload;
  communityName: string;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneReport> {
  // Step 1: Find the community by name to get community ID
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  // Step 2: Verify the member is a moderator or owner of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Query the report's community_id for authorization check
  const reportMeta =
    await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: { reddit_clone_community_id: true },
    });
  // Step 4: Verify the report belongs to the specified community
  if (reportMeta.reddit_clone_community_id !== community.id) {
    throw new HttpException("Report not found", 404);
  }
  // Step 5: Query the full report using transformer and return
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditCloneReportTransformer.select(),
  });
  return await RedditCloneReportTransformer.transform(report);
}
