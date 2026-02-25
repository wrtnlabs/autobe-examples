import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
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
  // Resolve community_id from target content and verify existence
  let communityId: string;
  if (props.body.content_type === "POST") {
    const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
      where: { id: props.body.content_id },
    });
    communityId = post.community_id;
  } else {
    const comment = await MyGlobal.prisma.community_comments.findFirstOrThrow({
      where: { id: props.body.content_id },
    });
    const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
      where: { id: comment.community_post_id },
    });
    communityId = post.community_id;
  }
  // Ban check - verify reporter is not banned from the community
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: {
      community_id_member_id: {
        community_id: communityId,
        member_id: props.member.id,
      },
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Create report using collector for data transformation
  const report = await MyGlobal.prisma.community_reports.create({
    data: await CommunityReportCollector.collect({
      body: props.body,
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityReportTransformer.select(),
  });
  // Transform and return using transformer for response formatting
  return await CommunityReportTransformer.transform(report);
}
