import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityReportCollector } from "../collectors/CommunityReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityMemberReports(props: {
  member: MemberPayload;
  body: ICommunityReport.ICreate;
}): Promise<ICommunityReport> {
  const memberEntity = await MyGlobal.prisma.community_members.findUnique({
    where: { id: props.member.id },
  });
  if (!memberEntity) {
    throw new HttpException("Member not found", 404);
  }
  const created = await MyGlobal.prisma.community_reports.create({
    data: await CommunityReportCollector.collect({
      body: props.body,
      communityMembers: memberEntity,
      communityGuests: memberEntity,
      communityModerators: memberEntity,
      communityAdmins: memberEntity,
    }),
    select: {
      id: true,
      reporter_id: true,
      reported_content_id: true,
      content_type: true,
      reason: true,
      created_at: true,
      updated_at: true,
      status: true,
    },
  });
  return created;
}
