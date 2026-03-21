import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberCommunitiesCommunityNameReportsReportId(props: {
  member: MemberPayload;
  communityName: string;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityReport.IDismiss;
}): Promise<void> {
  // 1. Find community by name
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true, deleted_at: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify member is moderator in the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Find the report
  const report = await MyGlobal.prisma.reddit_clone_community_reports.findFirst(
    {
      where: {
        id: props.reportId,
        reddit_clone_community_id: community.id,
      },
      select: {
        id: true,
        status: true,
      },
    },
  );
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // 4. Check edge cases
  if (report.status === "approved") {
    throw new HttpException("Report already approved", 400);
  }
  if (report.status === "dismissed") {
    throw new HttpException("Report already dismissed", 409);
  }
  // 5. Update the report to dismissed status
  const now = new Date();
  await MyGlobal.prisma.reddit_clone_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_by_id: props.member.id,
      resolved_at: now,
      resolution_note: props.body.resolution_note ?? null,
      updated_at: now,
    },
  });
}
