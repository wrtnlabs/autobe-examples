import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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
import { CommunityReportTransformer } from "../transformers/CommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberReports(props: {
  member: MemberPayload;
  body: ICommunityReport.ICreate;
}): Promise<ICommunityReport> {
  const created = await MyGlobal.prisma.community_reports.create({
    data: await CommunityReportCollector.collect({
      body: props.body,
      communityMembers: { id: props.member.id },
    }),
    ...CommunityReportTransformer.select(),
  });
  return await CommunityReportTransformer.transform(created);
}
