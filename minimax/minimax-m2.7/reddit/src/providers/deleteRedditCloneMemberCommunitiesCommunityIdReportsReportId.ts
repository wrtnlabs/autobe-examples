import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditCloneMemberCommunitiesCommunityIdReportsReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Validate report exists, belongs to community, and is pending
  const report =
    await MyGlobal.prisma.reddit_clone_community_reports.findUnique({
      where: { id: props.reportId },
      select: {
        id: true,
        reddit_clone_community_id: true,
        status: true,
      },
    });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  if (report.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 400);
  }
  // 3. Verify the member is a moderator of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (moderator === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // 4. Update the report with dismissed status
  await MyGlobal.prisma.reddit_clone_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_by_id: props.member.id,
      resolved_at: new Date(),
      updated_at: new Date(),
    },
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditCloneMemberCommunitiesCommunityIdReportsReportId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------